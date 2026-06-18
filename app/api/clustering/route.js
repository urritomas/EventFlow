import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { kmeans } from "ml-kmeans";

const FEATURE_KEYS = [
  "registered_event_count",
  "missed_check_in_count",
  "event_count",
  "check_in_count",
  "check_out_count",
  "verified_count",
  "avg_similarity",
  "avg_duration_minutes",
];

const ATTENDANCE_COLUMN_CANDIDATES = [
  "participant_id",
  "event_id",
  "verified",
  "check_in_time",
  "check_out_time",
  "check_in_similarity",
];
const FALLBACK_ATTENDANCE_COLUMN_CANDIDATES = [
  "participant_id",
  "event_id",
  "verified",
  "check_in_time",
  "check_out_time",
];

const CLUSTER_LABELS = ["High Performers", "Moderate Performers", "Low Performers"];
const COLD_START_THRESHOLD = 0.18;
const LOW_CONFIDENCE_THRESHOLD = 0.45;

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const participantIdParam = url.searchParams.get("participantId");
    const eventIdParam = url.searchParams.get("eventId");
    const eventIdNumber = eventIdParam ? Number(eventIdParam) : null;

    if ((participantIdParam && !Number.isFinite(Number(participantIdParam))) || (eventIdParam && !Number.isFinite(eventIdNumber))) {
      return NextResponse.json({ error: "Invalid participantId or eventId parameter." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Missing Supabase configuration.", details: "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    let participants = [];

    if (eventIdParam) {
      const { data: eventParticipants, error } = await supabase
        .from("event_participants")
        .select("participant_id, participants(participant_id, name, rfid, email)")
        .eq("event_id", eventIdNumber);

      if (error) throw error;
      participants = (eventParticipants || []).map((row) => row.participants || {
        participant_id: row.participant_id,
        name: `Participant ${row.participant_id}`,
      });
    } else {
      const { data, error } = await supabase
        .from("participants")
        .select("participant_id, name, rfid, email");

      if (error) throw error;
      participants = data || [];
    }

    let attendanceQuery = supabase.from("attendance").select(ATTENDANCE_COLUMN_CANDIDATES.join(", "));
    if (eventIdParam) {
      attendanceQuery = attendanceQuery.eq("event_id", eventIdNumber);
    } else if (participantIdParam) {
      attendanceQuery = attendanceQuery.eq("participant_id", participantIdParam);
    }

    let attendanceRes = await attendanceQuery;
    if (attendanceRes.error && isMissingColumnError(attendanceRes.error)) {
      attendanceQuery = supabase.from("attendance").select(FALLBACK_ATTENDANCE_COLUMN_CANDIDATES.join(", "));
      if (eventIdParam) {
        attendanceQuery = attendanceQuery.eq("event_id", eventIdNumber);
      } else if (participantIdParam) {
        attendanceQuery = attendanceQuery.eq("participant_id", participantIdParam);
      }
      attendanceRes = await attendanceQuery;
    }

    const { data: attendance, error } = attendanceRes;
    if (error) throw error;

    const registeredEventIdsByParticipant = new Map();
    if (participantIdParam && !eventIdParam) {
      const { data: participantRegistrations, error } = await supabase
        .from("event_participants")
        .select("event_id")
        .eq("participant_id", participantIdParam);

      if (error) throw error;
      (participantRegistrations || []).forEach((registration) => {
        if (registration.event_id == null) return;
        const participantId = Number(participantIdParam);
        if (!registeredEventIdsByParticipant.has(participantId)) registeredEventIdsByParticipant.set(participantId, new Set());
        registeredEventIdsByParticipant.get(participantId).add(Number(registration.event_id));
      });
    }

    const clusterResult = runAdaptiveClustering(participants, attendance || [], {
      eventId: eventIdNumber,
      registeredEventIdsByParticipant,
    });
    const targetParticipantId = participantIdParam ? Number(participantIdParam) : null;
    const clusterAssignment = targetParticipantId == null
      ? null
      : clusterResult.participantAssignments.find((assignment) => Number(assignment.participantId) === targetParticipantId) || null;

    return NextResponse.json({
      ...clusterResult,
      clusterAssignment,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const normalizedError = normalizeError(error, "Failed to generate clustering insights.");
    console.error("[clustering] Error:", normalizedError.message, normalizedError.details);
    return NextResponse.json(
      { error: normalizedError.message, details: normalizedError.details },
      { status: normalizedError.status }
    );
  }
}

function isMissingColumnError(error) {
  return error?.code === "42703" || String(error?.details || error?.message || "").includes("does not exist");
}

function runAdaptiveClustering(participants, attendanceRecords, options = {}) {
  const features = extractMlFeatures(participants, attendanceRecords, options);
  const densityMetrics = calculateDataDensityMetrics(features);
  const strategy = selectClusteringStrategy(densityMetrics);

  if (strategy.name === "cold_start") {
    return buildColdStartResponse(features, densityMetrics, strategy);
  }

  const augmentedDataset = strategy.augmentWithSyntheticPriors
    ? addPriorSyntheticAnchors(features, densityMetrics)
    : { features, realIndexes: features.map((_, index) => index) };

  const rawVectors = augmentedDataset.features.map((feature) => FEATURE_KEYS.map((key) => feature[key]));
  const normalizedVectors = normalizeFeatureVectors(rawVectors);
  const clusterCount = Math.min(strategy.clusterCount, normalizedVectors.length);
  const kmeansResult = kmeans(normalizedVectors, clusterCount, {
    initialization: "kmeans++",
    maxIterations: 300,
    seed: 42,
  });

  const assignments = kmeansResult.clusters;
  const silhouetteScores = calculateSilhouetteScores(normalizedVectors, assignments);
  const realIndexes = augmentedDataset.realIndexes;
  const realFeatures = realIndexes.map((index) => augmentedDataset.features[index]);
  const realAssignments = realIndexes.map((index) => assignments[index]);
  const realSilhouetteScores = realIndexes.map((index) => silhouetteScores[index]);
  const clusterGroups = groupAssignments(realAssignments);
  const clusters = buildClusters(clusterGroups, realFeatures, realSilhouetteScores);
  const summary = buildSummary(clusters);
  const participantAssignments = buildParticipantAssignments(realFeatures, clusters, realSilhouetteScores);
  const silhouetteScoresWithParticipants = realFeatures.map((feature, index) => ({
    participantId: feature.participantId,
    participantName: feature.participantName,
    silhouetteScore: realSilhouetteScores[index],
    silhouetteInterpretation: getSilhouetteInterpretation(realSilhouetteScores[index]),
  }));
  const averageSilhouetteScore = Number(average(realSilhouetteScores.filter((score) => score != null)).toFixed(4));
  const confidence = Number(clamp((densityMetrics.signalScore * 0.65) + (averageSilhouetteScore * 0.35), 0, 1).toFixed(4));

  return {
    clusters,
    summary,
    participantAssignments,
    silhouetteScores: silhouetteScoresWithParticipants,
    averageSilhouetteScore,
    totalParticipants: participants.length,
    status: strategy.status,
    confidence,
    density: densityMetrics,
    strategy: {
      ...strategy,
      clusterCount,
      augmentedWithSyntheticPriors: strategy.augmentWithSyntheticPriors,
      syntheticAnchorCount: augmentedDataset.features.length - realFeatures.length,
    },
    algorithm: getAlgorithmMetadata(clusterCount, strategy.name),
    generatedAt: new Date().toISOString(),
  };
}

function extractMlFeatures(participants, attendanceRecords, options = {}) {
  const participantInfo = new Map();
  const registeredEventIdsByParticipant = new Map();

  participants.forEach((participant) => {
    const participantId = Number(participant.participant_id);
    if (!Number.isFinite(participantId)) return;

    participantInfo.set(participantId, {
      participantId,
      participantName: participant.name || `Participant ${participantId}`,
    });
    registeredEventIdsByParticipant.set(participantId, options.registeredEventIdsByParticipant?.get(participantId) || new Set(options.eventId != null ? [options.eventId] : []));
  });

  const groupedAttendance = new Map();
  const ensureAttendanceBucket = (participantId) => {
    if (!groupedAttendance.has(participantId)) {
      groupedAttendance.set(participantId, {
        eventIds: new Set(),
        checkInCount: 0,
        checkOutCount: 0,
        verifiedCount: 0,
        similarities: [],
        durations: [],
      });
    }
    return groupedAttendance.get(participantId);
  };

  for (const record of attendanceRecords) {
    const participantId = Number(record.participant_id);
    if (!Number.isFinite(participantId)) continue;

    if (!participantInfo.has(participantId)) {
      participantInfo.set(participantId, {
        participantId,
        participantName: `Participant ${participantId}`,
      });
    }

    if (!registeredEventIdsByParticipant.has(participantId)) {
      registeredEventIdsByParticipant.set(participantId, new Set());
    }

    const attendance = ensureAttendanceBucket(participantId);
    if (record.event_id != null) attendance.eventIds.add(Number(record.event_id));
    if (record.check_in_time) attendance.checkInCount += 1;
    if (record.check_out_time) attendance.checkOutCount += 1;
    if (record.verified) attendance.verifiedCount += 1;

    const similarity = record.check_in_similarity ?? record.similarity ?? record.avg_similarity ?? 0;
    if (Number(similarity) > 0) attendance.similarities.push(Number(similarity));

    if (record.check_in_time && record.check_out_time) {
      const durationMinutes = getDurationMinutes(record.check_in_time, record.check_out_time);
      if (Number.isFinite(durationMinutes) && durationMinutes >= 0) {
        attendance.durations.push(durationMinutes);
      }
    }
  }

  const allParticipantIds = new Set([
    ...participantInfo.keys(),
    ...registeredEventIdsByParticipant.keys(),
    ...groupedAttendance.keys(),
  ]);

  return Array.from(allParticipantIds)
    .sort((a, b) => a - b)
    .map((participantId) => {
      const info = participantInfo.get(participantId) || {
        participantId,
        participantName: `Participant ${participantId}`,
      };
      const registeredEventIds = registeredEventIdsByParticipant.get(participantId) || new Set();
      const attendance = groupedAttendance.get(participantId) || createZeroAttendanceBucket();
      const registeredEventCount = registeredEventIds.size;
      const missedCheckInCount = Math.max(registeredEventCount - attendance.checkInCount, 0);
      const hasAttendanceSignal = Boolean(
        attendance.eventIds.size ||
        attendance.checkInCount ||
        attendance.checkOutCount ||
        attendance.verifiedCount ||
        attendance.durations.length
      );
      const attendanceStatus = hasAttendanceSignal
        ? getAttendanceStatus(attendance)
        : registeredEventIds.size > 0
          ? "registered_no_attendance"
          : "no_registration";

      return {
        participantId,
        participantName: info.participantName,
        registered_event_count: registeredEventCount,
        missed_check_in_count: missedCheckInCount,
        attendance_event_count: attendance.eventIds.size,
        event_count: attendance.eventIds.size,
        check_in_count: attendance.checkInCount,
        check_out_count: attendance.checkOutCount,
        verified_count: attendance.verifiedCount,
        avg_similarity: attendance.similarities.length
          ? average(attendance.similarities)
          : 0,
        avg_duration_minutes: attendance.durations.length
          ? average(attendance.durations)
          : 0,
        attendance_status: attendanceStatus,
      };
    });
}

function createZeroAttendanceBucket() {
  return {
    eventIds: new Set(),
    checkInCount: 0,
    checkOutCount: 0,
    verifiedCount: 0,
    similarities: [],
    durations: [],
  };
}

function getAttendanceStatus(attendance) {
  if (attendance.checkInCount > 0 && attendance.checkOutCount > 0) return "checked_in_and_out";
  if (attendance.checkInCount > 0) return "checked_in_only";
  if (attendance.verifiedCount > 0) return "verified_without_checkout";
  return "partial_attendance";
}

function calculateDataDensityMetrics(features) {
  const totalParticipants = features.length;
  const cellCount = Math.max(totalParticipants * FEATURE_KEYS.length, 1);
  const nonzeroCells = features.reduce((sum, feature) => {
    return sum + FEATURE_KEYS.filter((key) => feature[key] > 0).length;
  }, 0);
  const populatedParticipants = features.filter((feature) => FEATURE_KEYS.some((key) => feature[key] > 0)).length;
  const coverage = totalParticipants > 0 ? populatedParticipants / totalParticipants : 0;
  const nonzeroRatio = nonzeroCells / cellCount;
  const featureStats = FEATURE_KEYS.map((key) => {
    const values = features.map((feature) => feature[key]);
    const mean = average(values);
    const variance = average(values.map((value) => (value - mean) ** 2));
    const maxValue = Math.max(...values, 1);
    return {
      key,
      mean,
      variance,
      normalizedVariance: maxValue > 0 ? clamp(variance / (maxValue ** 2), 0, 1) : 0,
    };
  });
  const averageNormalizedVariance = average(featureStats.map((stat) => stat.normalizedVariance));
  const signalScore = clamp((coverage * 0.45) + (nonzeroRatio * 0.35) + (averageNormalizedVariance * 0.20), 0, 1);

  return {
    totalParticipants,
    populatedParticipants,
    coverage: Number(coverage.toFixed(4)),
    nonzeroRatio: Number((nonzeroRatio).toFixed(4)),
    averageNormalizedVariance: Number(averageNormalizedVariance.toFixed(4)),
    signalScore: Number(signalScore.toFixed(4)),
    featureStats,
  };
}

function selectClusteringStrategy(densityMetrics) {
  if (densityMetrics.totalParticipants <= 0) {
    return {
      name: "cold_start",
      status: "cold_start",
      clusterCount: 0,
      confidence: 0,
      augmentWithSyntheticPriors: false,
      reason: "no_participant_data",
      description: "No participants are available for clustering.",
    };
  }

  const maxClusters = densityMetrics.signalScore < LOW_CONFIDENCE_THRESHOLD ? 2 : 3;
  const clusterCount = Math.max(1, Math.ceil(densityMetrics.signalScore * maxClusters));
  const augmentWithSyntheticPriors = densityMetrics.signalScore < LOW_CONFIDENCE_THRESHOLD && densityMetrics.totalParticipants < 3;
  const status = densityMetrics.signalScore < LOW_CONFIDENCE_THRESHOLD ? "low_confidence" : "ready";

  return {
    name: augmentWithSyntheticPriors ? "adaptive_kmeans_with_prior_anchors" : "adaptive_kmeans",
    status,
    clusterCount,
    confidence: densityMetrics.signalScore,
    augmentWithSyntheticPriors,
    reason: status === "low_confidence" ? "sparse_attendance_data" : "sufficient_attendance_data",
    description: status === "low_confidence"
      ? "Clustering is available but should be treated as early-stage."
      : "Clustering is based on sufficient attendance density.",
  };
}

function addPriorSyntheticAnchors(features, densityMetrics) {
  const featureRanges = FEATURE_KEYS.map((key) => {
    const values = features.map((feature) => feature[key]);
    return {
      key,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  });
  const anchors = [
    createSyntheticAnchor("Synthetic Low Engagement Anchor", featureRanges, "low"),
    createSyntheticAnchor("Synthetic Moderate Engagement Anchor", featureRanges, "moderate"),
    createSyntheticAnchor("Synthetic High Engagement Anchor", featureRanges, "high"),
  ].map((anchor, index) => ({
    ...anchor,
    participantId: `synthetic_${index}`,
    synthetic: true,
  }));

  return {
    features: [
      ...features.map((feature) => ({ ...feature, synthetic: false })),
      ...anchors,
    ],
    realIndexes: features.map((_, index) => index),
    densityMetrics,
  };
}

function createSyntheticAnchor(name, featureRanges, level) {
  const ratios = {
    low: 0.08,
    moderate: 0.5,
    high: 0.92,
  };
  const ratio = ratios[level];

  return featureRanges.reduce((anchor, range) => {
    anchor[range.key] = range.min + ((range.max - range.min) * ratio);
    return anchor;
  }, {
    participantName: name,
  });
}

function buildColdStartResponse(features, densityMetrics, strategy) {
  const participantAssignments = features.map((feature) => ({
    participantId: feature.participantId,
    participantName: feature.participantName,
    clusterId: null,
    label: null,
    performanceScore: 0,
    centroid: {},
    silhouetteScore: 0,
    silhouetteInterpretation: "Not enough data to calculate silhouette score",
    features: FEATURE_KEYS.reduce((acc, key) => {
      acc[key] = Number(feature[key].toFixed(4));
      return acc;
    }, {}),
    attendanceStatus: feature.attendance_status,
    registeredEventCount: feature.registered_event_count,
    attendanceEventCount: feature.attendance_event_count,
  }));

  return {
    clusters: [],
    summary: { high_performers: 0, moderate_performers: 0, low_performers: 0 },
    participantAssignments,
    silhouetteScores: participantAssignments.map((assignment) => ({
      participantId: assignment.participantId,
      participantName: assignment.participantName,
      silhouetteScore: 0,
      silhouetteInterpretation: "Not enough data to calculate silhouette score",
    })),
    averageSilhouetteScore: 0,
    totalParticipants: densityMetrics.totalParticipants,
    status: strategy.status,
    confidence: Number(strategy.confidence.toFixed(4)),
    density: densityMetrics,
    strategy,
    algorithm: getAlgorithmMetadata(0, strategy.name),
    generatedAt: new Date().toISOString(),
  };
}

function normalizeFeatureVectors(rawVectors) {
  if (!rawVectors.length) return [];
  const normalizedColumns = rawVectors[0]
    .map((_, columnIndex) => {
      const columnValues = rawVectors.map((row) => row[columnIndex]);
      const min = Math.min(...columnValues);
      const max = Math.max(...columnValues);
      const range = max - min || 1;
      return columnValues.map((value) => (value - min) / range);
    });

  return normalizedColumns[0].map((_, rowIndex) =>
    normalizedColumns.map((column) => column[rowIndex])
  );
}

function groupAssignments(assignments) {
  const clusterGroups = new Map();
  assignments.forEach((clusterId, index) => {
    if (!clusterGroups.has(clusterId)) clusterGroups.set(clusterId, []);
    clusterGroups.get(clusterId).push(index);
  });
  return clusterGroups;
}

function calculateClusterAttendanceScore(features) {
  if (!features.length) return 0;
  const centroid = FEATURE_KEYS.reduce((acc, key) => {
    acc[key] = average(features.map((feature) => feature[key]));
    return acc;
  }, {});

  const registeredEvents = centroid.registered_event_count;
  const attendedEvents = centroid.event_count;
  const missedCheckIns = centroid.missed_check_in_count;
  const checkIns = centroid.check_in_count;
  const checkOuts = centroid.check_out_count;
  const verified = centroid.verified_count;
  const avgSimilarity = centroid.avg_similarity;
  const durationFactor = Math.min(centroid.avg_duration_minutes / 120, 1);

  if (registeredEvents > 0) {
    const attendanceRate = attendedEvents / registeredEvents;
    const checkInRate = checkIns / registeredEvents;
    const checkOutRate = checkOuts / registeredEvents;
    const verificationRate = verified / registeredEvents;
    const missedRate = missedCheckIns / registeredEvents;
    const attendanceComponent = (attendanceRate * 0.35) + (checkInRate * 0.15) + (checkOutRate * 0.10) + (verificationRate * 0.10);
    const qualityComponent = (avgSimilarity * 0.20) + (durationFactor * 0.10);
    const missedPenalty = missedRate * 0.15;
    return clamp(attendanceComponent + qualityComponent - missedPenalty, 0, 1);
  }

  const rawPositiveSignal = attendedEvents + checkIns + checkOuts + verified + avgSimilarity + durationFactor;
  return clamp(rawPositiveSignal / Math.max(missedCheckIns + attendedEvents + checkIns + checkOuts + verified + 1, 1), 0, 1);
}

function buildClusters(clusterGroups, features, silhouetteScores) {
  const clusters = Array.from(clusterGroups.entries()).map(([clusterId, memberIndexes]) => {
    const memberFeatures = memberIndexes.map((index) => features[index]);
    const memberSilhouettes = memberIndexes.map((index) => silhouetteScores[index]);
    const clusterFitScore = average(memberSilhouettes);
    const centroid = FEATURE_KEYS.reduce((acc, key) => {
      acc[key] = Number((average(memberFeatures.map((feature) => feature[key]))).toFixed(4));
      return acc;
    }, {});

    return {
      clusterId,
      label: `Cluster ${clusterId + 1}`,
      performanceScore: Math.round(calculateClusterAttendanceScore(memberFeatures) * 100),
      averageSilhouetteScore: Number(clusterFitScore.toFixed(4)),
      memberIds: memberFeatures.map((feature) => feature.participantId),
      memberNames: memberFeatures.map((feature) => feature.participantName),
      centroid,
    };
  });

  return clusters
    .sort((a, b) => b.performanceScore - a.performanceScore)
    .map((cluster, index) => ({
      ...cluster,
      clusterId: index,
      label: getClusterLabel(cluster, index, clusters.length),
    }));
}

function getClusterLabel(cluster, clusterIndex, totalClusters) {
  if (totalClusters === 1) {
    if (cluster.performanceScore >= 70) return "High Performers";
    if (cluster.performanceScore < 40) return "Low Performers";
    return "Moderate Performers";
  }

  return CLUSTER_LABELS[clusterIndex] || `Cluster ${clusterIndex + 1}`;
}

function buildSummary(clusters) {
  const summary = { high_performers: 0, moderate_performers: 0, low_performers: 0 };
  clusters.forEach((cluster) => {
    const key = cluster.label.toLowerCase().replace(" ", "_");
    if (key in summary) summary[key] = cluster.memberIds.length;
  });
  return summary;
}

function buildParticipantAssignments(features, clusters, silhouetteScores) {
  return features.map((feature, index) => {
    const cluster = clusters.find((item) => item.memberIds.includes(feature.participantId));
    return {
      participantId: feature.participantId,
      participantName: feature.participantName,
      clusterId: cluster?.clusterId ?? null,
      label: cluster?.label ?? null,
      performanceScore: cluster?.performanceScore ?? 0,
      centroid: cluster?.centroid ?? {},
      silhouetteScore: silhouetteScores[index],
      silhouetteInterpretation: getSilhouetteInterpretation(silhouetteScores[index]),
      features: FEATURE_KEYS.reduce((acc, key) => {
        acc[key] = Number(feature[key].toFixed(4));
        return acc;
      }, {}),
      attendanceStatus: feature.attendance_status,
      registeredEventCount: feature.registered_event_count,
      attendanceEventCount: feature.attendance_event_count,
    };
  });
}

function calculateSilhouetteScores(vectors, assignments) {
  if (!vectors.length) return [];
  if (new Set(assignments).size < 2) return vectors.map(() => 0);

  return vectors.map((vector, index) => {
    const clusterId = assignments[index];
    const sameClusterIndexes = assignments
      .map((assignment, assignmentIndex) => assignment === clusterId ? assignmentIndex : null)
      .filter((assignmentIndex) => assignmentIndex != null && assignmentIndex !== index);

    if (!sameClusterIndexes.length) return 0;

    const a = average(sameClusterIndexes.map((otherIndex) => euclideanDistance(vector, vectors[otherIndex])));
    const otherClusterIds = [...new Set(assignments)].filter((assignment) => assignment !== clusterId);
    const b = Math.min(
      ...otherClusterIds.map((otherClusterId) => {
        const otherClusterIndexes = assignments
          .map((assignment, assignmentIndex) => assignment === otherClusterId ? assignmentIndex : null)
          .filter((assignmentIndex) => assignmentIndex != null);
        return average(otherClusterIndexes.map((otherIndex) => euclideanDistance(vector, vectors[otherIndex])));
      })
    );

    const denominator = Math.max(a, b);
    if (denominator === 0) return 0;
    return Number(((b - a) / denominator).toFixed(4));
  });
}

function getSilhouetteInterpretation(score) {
  if (score == null) return "Not enough data to calculate silhouette score";
  if (score >= 0.65) return "Close to 1: well-matched and clearly separated";
  if (score >= 0.25) return "Positive separation from nearby clusters";
  if (score >= -0.25) return "Close to 0: near the boundary between clusters";
  return "Close to -1: may be assigned to the wrong cluster";
}

function getAlgorithmMetadata(clusterCount, strategyName) {
  return {
    name: "KMeans",
    strategy: strategyName,
    library: "ml-kmeans",
    initialization: "kmeans++",
    clusterCount,
    maxIterations: 300,
    featureSchema: FEATURE_KEYS,
  };
}

function getDurationMinutes(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return NaN;
  return (endDate.getTime() - startDate.getTime()) / (1000 * 60);
}

function euclideanDistance(a, b) {
  return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeError(error, fallbackMessage) {
  if (error instanceof Error) {
    return {
      message: error.message || fallbackMessage,
      details: error.stack || error.message || fallbackMessage,
      status: 500,
    };
  }

  if (error && typeof error === "object") {
    const details = error.details || error.hint || error.code || JSON.stringify(error);
    return {
      message: error.message || fallbackMessage,
      details,
      status: Number(error.status) || 500,
    };
  }

  return {
    message: fallbackMessage,
    details: String(error || "No error payload returned"),
    status: 500,
  };
}
