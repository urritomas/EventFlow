import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const participantIdParam = url.searchParams.get("participantId");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Missing Supabase configuration.", details: "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    let participantsQuery = supabase.from("participants").select("participant_id, name, rfid, email");

    if (participantIdParam) {
      participantsQuery = participantsQuery.eq("participant_id", participantIdParam);
    }

    const [participantsRes, attendanceRes] = await Promise.all([
      participantsQuery,
      participantIdParam
        ? supabase.from("attendance").select("*").eq("participant_id", participantIdParam)
        : supabase.from("attendance").select("*"),
    ]);

    const participants = participantsRes.data || [];
    const attendance = attendanceRes.data || [];

    if (!participants.length) {
      return NextResponse.json({
        clusters: [],
        summary: { high_performers: 0, moderate_performers: 0, low_performers: 0 },
        totalParticipants: 0,
        generatedAt: new Date().toISOString(),
      });
    }

    const clusterResult = runClustering(participants, attendance);

    let clusterAssignment = null;
    if (participantIdParam) {
      const targetParticipantId = Number(participantIdParam);
      const targetCluster = clusterResult.clusters.find((cluster) =>
        (cluster.memberIds || []).includes(targetParticipantId)
      );
      if (targetCluster) {
        clusterAssignment = {
          label: targetCluster.label,
          performanceScore: targetCluster.performanceScore,
          centroid: targetCluster.centroid,
        };
      }
    }

    return NextResponse.json({
      ...clusterResult,
      clusterAssignment,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const details = error instanceof Error ? error.stack : String(error);
    console.error("[clustering] Error:", message, details);
    return NextResponse.json(
      { error: "Failed to generate clustering insights.", details: message },
      { status: 500 }
    );
  }
}

function runClustering(participants, attendanceRecords) {
  const featureWeights = {
    attendance_rate: 0.35,
    avg_similarity: 0.25,
    punctuality_score: 0.20,
    event_diversity: 0.10,
    engagement_score: 0.10,
  };

  const participantAttendance = new Map();
  const participantEvents = new Map();

  for (const record of attendanceRecords) {
    const pid = record.participant_id;
    if (pid == null) continue;
    if (!participantAttendance.has(pid)) {
      participantAttendance.set(pid, []);
      participantEvents.set(pid, new Set());
    }
    participantAttendance.get(pid).push(record);
    participantEvents.get(pid).add(record.event_id);
  }

  const features = new Map();
  for (const p of participants) {
    const pid = p.participant_id;
    const logs = participantAttendance.get(pid) || [];
    const totalEvents = logs.length;
    const verifiedCount = logs.filter((log) => Boolean(log.verified)).length;
    const attendanceRate = totalEvents > 0 ? verifiedCount / totalEvents : 0;
    const avgSimilarity = 0.5;
    const lateCount = 0;
    const punctualityScore = totalEvents > 0 ? Math.max(0, 1 - lateCount / totalEvents) : 0.5;
    const eventDiversity = Math.min((participantEvents.get(pid)?.size || 0) / 10, 1);
    const checkIns = logs.filter((log) => log.check_in_time).length;
    const checkOuts = logs.filter((log) => log.check_out_time).length;
    const engagementScore = totalEvents > 0 ? (checkIns + checkOuts) / (totalEvents * 2) : 0;

    features.set(pid, {
      attendance_rate: attendanceRate,
      avg_similarity: avgSimilarity,
      punctuality_score: punctualityScore,
      event_diversity: eventDiversity,
      engagement_score: engagementScore,
    });
  }

  if (features.size === 0) {
    return {
      clusters: [],
      summary: { high_performers: 0, moderate_performers: 0, low_performers: 0 },
      totalParticipants: participants.length,
    };
  }

  const pidList = Array.from(features.keys()).sort((a, b) => a - b);
  const featureKeys = Object.keys(featureWeights);
  const rawVectors = pidList.map((pid) => featureKeys.map((key) => features.get(pid)[key]));

  const normalizedVectors = rawVectors[0].map((_, columnIndex) => {
    const columnValues = rawVectors.map((row) => row[columnIndex]);
    const min = Math.min(...columnValues);
    const max = Math.max(...columnValues);
    const range = max - min || 1;
    return columnValues.map((value) => (value - min) / range);
  });

  const vectors = normalizedVectors[0].map((_, rowIndex) =>
    normalizedVectors.map((column) => column[rowIndex])
  );

  const nClusters = Math.min(3, vectors.length);
  const centroids = initializeCentroids(vectors, nClusters);
  const assignments = assignClusters(vectors, centroids);

  const clusterGroups = new Map();
  for (let index = 0; index < pidList.length; index++) {
    const clusterId = assignments[index];
    if (!clusterGroups.has(clusterId)) clusterGroups.set(clusterId, []);
    clusterGroups.get(clusterId).push(pidList[index]);
  }

  const participantsById = new Map(participants.map((p) => [p.participant_id, p]));
  const clusterLabels = ["Low Performers", "Moderate Performers", "High Performers"];
  const summary = { high_performers: 0, moderate_performers: 0, low_performers: 0 };

  const clusters = Array.from(clusterGroups.entries())
    .map(([clusterId, memberPids]) => {
      const memberScores = memberPids.map((pid) =>
        featureKeys.reduce((score, key) => score + features.get(pid)[key] * featureWeights[key], 0)
      );
      const performanceScore = memberScores.length
        ? memberScores.reduce((sum, value) => sum + value, 0) / memberScores.length
        : 0;
      const label = clusterLabels[clusterId] ?? `Cluster ${clusterId}`;
      const normalizedScore = Math.round(Math.min(Math.max(performanceScore, 0), 1) * 100);
      const memberNames = memberPids.map((pid) => participantsById.get(pid)?.name || `ID ${pid}`);
      const centroid = featureKeys.reduce((acc, key, index) => {
        const featureVector = centroids[clusterId];
        acc[key] = Number((featureVector?.[index] ?? 0).toFixed(4));
        return acc;
      }, {});
      const summaryKey = label.toLowerCase().replace(" ", "_");
      if (summaryKey in summary) summary[summaryKey] = memberPids.length;

      return {
        clusterId,
        label,
        performanceScore: normalizedScore,
        memberIds: memberPids,
        memberNames,
        centroid,
      };
    })
    .sort((a, b) => b.performanceScore - a.performanceScore);

  return {
    clusters,
    summary,
    totalParticipants: participants.length,
  };
}

function initializeCentroids(vectors, k) {
  const selected = new Set();
  const centroids = [];

  const firstIndex = Math.floor(Math.random() * vectors.length);
  centroids.push([...vectors[firstIndex]]);
  selected.add(firstIndex);

  while (centroids.length < k) {
    const distances = vectors.map((vector, index) => {
      if (selected.has(index)) return 0;
      const minDist = Math.min(
        ...Array.from(selected).map((centerIndex) => euclideanDistance(vector, vectors[centerIndex]))
      );
      return minDist ** 2;
    });

    const totalDistance = distances.reduce((sum, value) => sum + value, 0);
    if (totalDistance === 0) {
      const remaining = vectors.map((_, index) => index).filter((index) => !selected.has(index));
      if (!remaining.length) break;
      centroids.push([...vectors[remaining[Math.floor(Math.random() * remaining.length)]]]);
      continue;
    }

    const probabilities = distances.map((value) => value / totalDistance);
    const randomValue = Math.random();
    let cumulative = 0;
    let nextCenter = centroids.length;

    for (let index = 0; index < probabilities.length; index++) {
      cumulative += probabilities[index];
      if (randomValue <= cumulative && !selected.has(index)) {
        nextCenter = index;
        break;
      }
    }

    centroids.push([...vectors[nextCenter]]);
    selected.add(nextCenter);
  }

  return centroids;
}

function assignClusters(vectors, centroids) {
  return vectors.map((vector) => {
    let minDistance = Infinity;
    let clusterId = 0;
    centroids.forEach((centroid, index) => {
      const distance = euclideanDistance(vector, centroid);
      if (distance < minDistance) {
        minDistance = distance;
        clusterId = index;
      }
    });
    return clusterId;
  });
}

function euclideanDistance(a, b) {
  return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));
}
