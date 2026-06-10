import json
import math
from collections import defaultdict
from dataclasses import dataclass
from typing import List, Dict, Any, Optional

@dataclass
class ClusterResult:
    cluster_id: int
    label: str
    performance_score: float
    member_ids: List[int]
    centroid: Dict[str, float]

class PerformanceClusterer:
    def __init__(self, n_clusters: int = 3):
        self.n_clusters = n_clusters
        self.feature_weights = {
            'attendance_rate': 0.35,
            'avg_similarity': 0.25,
            'punctuality_score': 0.20,
            'event_diversity': 0.10,
            'engagement_score': 0.10
        }

    def _normalize(self, values: List[float], min_val: float = 0.0, max_val: float = 1.0) -> List[float]:
        if not values:
            return []
        vmin, vmax = min(values), max(values)
        range_val = vmax - vmin if vmax > vmin else 1.0
        return [(v - vmin) / range_val * (max_val - min_val) + min_val for v in values]

    def _extract_features(self, participants: List[Dict[str, Any]], attendance_logs: List[Dict[str, Any]]) -> Dict[int, Dict[str, float]]:
        features = {}
        participant_attendance = defaultdict(list)
        participant_events = defaultdict(set)
        for log in attendance_logs:
            pid = log.get('participant_id')
            if pid is not None:
                participant_attendance[pid].append(log)
                participant_events[pid].add(log.get('event_id'))

        for p in participants:
            pid = p.get('participant_id')
            logs = participant_attendance.get(pid, [])
            total_events = len(logs)
            verified_count = sum(1 for log in logs if log.get('verified', False))
            attendance_rate = verified_count / total_events if total_events > 0 else 0.0
            similarities = [log.get('check_in_similarity', 0) for log in logs if log.get('check_in_similarity')]
            avg_similarity = sum(similarities) / len(similarities) if similarities else 0.5
            late_count = sum(1 for log in logs if log.get('is_late', False))
            punctuality_score = max(0.0, 1.0 - (late_count / total_events)) if total_events > 0 else 0.5
            event_diversity = min(len(participant_events[pid]) / 10.0, 1.0)
            check_ins = sum(1 for log in logs if log.get('check_in_at'))
            check_outs = sum(1 for log in logs if log.get('check_out_at'))
            engagement_score = (check_ins + check_outs) / (total_events * 2) if total_events > 0 else 0.0
            features[pid] = {
                'attendance_rate': attendance_rate,
                'avg_similarity': avg_similarity,
                'punctuality_score': punctuality_score,
                'event_diversity': event_diversity,
                'engagement_score': engagement_score
            }
        return features

    def _compute_weighted_score(self, feature_vector: Dict[str, float]) -> float:
        score = 0.0
        for feature, weight in self.feature_weights.items():
            score += feature_vector.get(feature, 0.0) * weight
        return min(max(score, 0.0), 1.0)

    def _kmeans_plus_plus(self, vectors: List[List[float]], k: int, rng_seed: int = 42) -> List[List[float]]:
        if not vectors or k <= 0:
            return []
        n = len(vectors)
        if k >= n:
            return [list(v) for v in vectors[:k]]
        import random
        random.seed(rng_seed)
        centroids = [list(vectors[random.randint(0, n - 1)])]
        while len(centroids) < k:
            distances = []
            for v in vectors:
                min_dist = min(math.dist(v, c) for c in centroids)
                distances.append(min_dist ** 2)
            total = sum(distances)
            if total == 0:
                centroids.append(list(vectors[random.randint(0, n - 1)]))
                continue
            probs = [d / total for d in distances]
            cumulative = []
            running = 0.0
            for p in probs:
                running += p
                cumulative.append(running)
            r = random.random()
            for i, cp in enumerate(cumulative):
                if r <= cp:
                    centroids.append(list(vectors[i]))
                    break
        return centroids

    def cluster(self, participants: List[Dict[str, Any]], attendance_logs: List[Dict[str, Any]]) -> Dict[str, Any]:
        features = self._extract_features(participants, attendance_logs)
        if not features:
            return {'clusters': [], 'summary': {'high_performers': 0, 'moderate_performers': 0, 'low_performers': 0}}
        pid_list = sorted(features.keys())
        feature_keys = list(self.feature_weights.keys())
        vectors = [[features[pid][key] for key in feature_keys] for pid in pid_list]
        normalized_vectors = [list(v) for v in zip(*[self._normalize([vec[i] for vec in vectors]) for i in range(len(feature_keys))])]
        centroids = self._kmeans_plus_plus(normalized_vectors, self.n_clusters)
        if not centroids:
            return {'clusters': [], 'summary': {'high_performers': 0, 'moderate_performers': 0, 'low_performers': 0}}
        assignments = []
        for vec in normalized_vectors:
            dists = [math.dist(vec, c) for c in centroids]
            assignments.append(int(dists.index(min(dists))))
        cluster_groups = defaultdict(list)
        for pid, label in zip(pid_list, assignments):
            cluster_groups[label].append(pid)
        cluster_labels = {0: 'Low Performers', 1: 'Moderate Performers', 2: 'High Performers'}
        results = []
        for cluster_id, member_pids in cluster_groups.items():
            member_scores = [self._compute_weighted_score(features[pid]) for pid in member_pids]
            avg_score = sum(member_scores) / len(member_scores) if member_scores else 0.0
            centroid_vec = centroids[cluster_id] if cluster_id < len(centroids) else [0.0] * len(feature_keys)
            centroid_dict = {feature_keys[i]: round(float(centroid_vec[i]), 4) for i in range(len(feature_keys))}
            named_label = cluster_labels.get(cluster_id, f"Cluster {cluster_id}")
            member_names = []
            participants_by_id = {p.get('participant_id'): p for p in participants}
            for mid in member_pids:
                p = participants_by_id.get(mid, {})
                member_names.append(p.get('name') or f'ID {mid}')
            results.append(ClusterResult(
                cluster_id=int(cluster_id),
                label=named_label,
                performance_score=avg_score,
                member_ids=[int(x) for x in member_pids],
                centroid=centroid_dict
            ))
        results.sort(key=lambda c: c.performance_score, reverse=True)
        summary_counts = {'high_performers': 0, 'moderate_performers': 0, 'low_performers': 0}
        for r in results:
            key = r.label.lower().replace(' ', '_')
            if key in summary_counts:
                summary_counts[key] = len(r.member_ids)
        return {
            'clusters': [
                {
                    'clusterId': r.cluster_id,
                    'label': r.label,
                    'performanceScore': round(r.performance_score * 100),
                    'memberIds': r.member_ids,
                    'memberNames': [participants_by_id.get(mid, {}).get('name', f'ID {mid}') for mid in r.member_ids],
                    'centroid': r.centroid
                }
                for r in results
            ],
            'summary': summary_counts,
            'totalParticipants': len(pid_list)
        }


def handler(event: Optional[Dict[str, Any]] = None, context: Optional[Any] = None) -> Dict[str, Any]:
    if event and isinstance(event, dict) and event.get('test'):
        participants = [
            {'participant_id': 1, 'name': 'Alice', 'rfid': '001'},
            {'participant_id': 2, 'name': 'Bob', 'rfid': '002'},
            {'participant_id': 3, 'name': 'Charlie', 'rfid': '003'}
        ]
        attendance_logs = [
            {'participant_id': 1, 'event_id': 1, 'verified': True, 'check_in_similarity': 0.95, 'is_late': False},
            {'participant_id': 2, 'event_id': 1, 'verified': True, 'check_in_similarity': 0.82, 'is_late': True},
            {'participant_id': 3, 'event_id': 2, 'verified': False, 'check_in_similarity': 0.6, 'is_late': True}
        ]
        clusterer = PerformanceClusterer(n_clusters=3)
        result = clusterer.cluster(participants, attendance_logs)
        return {'statusCode': 200, 'body': json.dumps(result)}
    return {'statusCode': 200, 'body': json.dumps({'clusters': [], 'summary': {'high_performers': 0, 'moderate_performers': 0, 'low_performers': 0}, 'totalParticipants': 0})}
