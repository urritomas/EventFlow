import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ParticipantFeatures:
    participant_id: int
    name: str
    attendance_rate: float
    punctuality_score: float
    engagement_score: float
    event_diversity: float
    avg_lateness_minutes: float
    total_events_registered: int
    total_events_attended: int
    late_checkins: int
    early_checkins: int

@dataclass
class ClusterResult:
    cluster_id: int
    label: str
    performance_score: float
    member_ids: List[int]
    member_names: List[str]
    centroid: Dict[str, float]
    size: int

class PerformanceClusteringModel:
    """
    Machine Learning clustering model for participant performance analysis.
    
    Features used:
    - attendance_rate: Ratio of verified attendances to registered events
    - punctuality_score: Measure of timeliness (1 - late_ratio)
    - engagement_score: Participation depth (check-ins + check-outs)
    - event_diversity: Variety of events attended
    - avg_lateness_minutes: Average minutes late for late arrivals
    
    These features are suitable for clustering because they:
    1. Are continuous and measurable on comparable scales after normalization
    2. Capture different aspects of participant behavior
    3. Have meaningful variance across participants
    4. Can distinguish between high/medium/low performers
    """
    
    FEATURE_COLUMNS = [
        'attendance_rate',
        'punctuality_score', 
        'engagement_score',
        'event_diversity',
        'avg_lateness_minutes'
    ]
    
    CLUSTER_LABELS = ['Low Performers', 'Moderate Performers', 'High Performers']
    
    def __init__(self, n_clusters: int = 3, random_state: int = 42):
        self.n_clusters = n_clusters
        self.random_state = random_state
        self._model = None
        self._scaler = None
        self._feature_weights = {
            'attendance_rate': 0.35,
            'punctuality_score': 0.25,
            'engagement_score': 0.20,
            'event_diversity': 0.15,
            'avg_lateness_minutes': 0.05
        }
    
    def calculate_punctuality_metrics(
        self, 
        attendance_logs: List[Dict], 
        event_start_times: Dict[int, str]
    ) -> Tuple[int, int, float]:
        """
        Calculate punctuality metrics including late arrivals.
        
        Late threshold: More than 15 minutes after event start time.
        Returns: (late_count, early_count, avg_lateness_minutes)
        """
        late_count = 0
        early_count = 0
        total_lateness = 0.0
        
        for log in attendance_logs:
            check_in_time = log.get('check_in_time')
            event_id = log.get('event_id')
            
            if not check_in_time or not event_id:
                continue
            
            event_start = event_start_times.get(event_id)
            if not event_start:
                continue
            
            try:
                check_in_dt = datetime.fromisoformat(str(check_in_time).replace('Z', '+00:00'))
                # Parse time portion - event_start is "HH:MM" format
                if ':' in str(event_start):
                    time_parts = str(event_start).split(':')
                    hours = int(time_parts[0])
                    minutes = int(time_parts[1].split('.')[0]) if '.' in time_parts[1] else int(time_parts[1])
                    event_start_dt = check_in_dt.replace(
                        hour=hours,
                        minute=minutes,
                        second=0,
                        microsecond=0
                    )
                    time_diff = (check_in_dt - event_start_dt).total_seconds() / 60  # minutes
                    
                    # Late if more than 15 minutes after start
                    if time_diff > 15:
                        late_count += 1
                        total_lateness += time_diff
                    elif time_diff <= 0:
                        early_count += 1
            except (ValueError, TypeError) as e:
                logger.debug(f"Could not parse time for log {log.get('attendance_id')}: {e}")
                continue
        
        avg_lateness = total_lateness / late_count if late_count > 0 else 0.0
        return late_count, early_count, avg_lateness
    
    def extract_features(
        self, 
        participants: List[Dict[str, Any]], 
        attendance_logs: List[Dict[str, Any]],
        event_start_times: Optional[Dict[int, str]] = None
    ) -> Tuple[pd.DataFrame, Dict[int, ParticipantFeatures]]:
        """
        Extract performance features for each participant.
        
        Args:
            participants: List of participant records with participant_id and name
            attendance_logs: List of attendance records with check_in/out times
            event_start_times: Optional mapping of event_id to start time for punctuality
        
        Returns:
            DataFrame with features and dictionary of ParticipantFeatures objects
        """
        if event_start_times is None:
            event_start_times = {}
        
        # Group attendance by participant
        participant_attendance = {}
        for log in attendance_logs:
            pid = log.get('participant_id')
            if pid is not None:
                if pid not in participant_attendance:
                    participant_attendance[pid] = []
                participant_attendance[pid].append(log)
        
        features_list = []
        features_by_id = {}
        
        for p in participants:
            pid = p.get('participant_id')
            if pid is None:
                continue
            
            logs = participant_attendance.get(pid, [])
            total_registered = len(logs)
            
            # Attendance rate: verified attendances / total registered
            verified_count = sum(1 for log in logs if log.get('verified', False))
            attendance_rate = verified_count / total_registered if total_registered > 0 else 0.0
            
            # Calculate punctuality using event start times
            late_count, early_count, avg_lateness = self.calculate_punctuality_metrics(logs, event_start_times)
            punctuality_score = max(0.0, 1.0 - (late_count / max(total_registered, 1)))
            
            # Also count explicit is_late flags from attendance records
            explicit_late = sum(1 for log in logs if log.get('is_late') == True)
            if explicit_late > late_count:
                late_count = explicit_late
                punctuality_score = max(0.0, 1.0 - (late_count / max(total_registered, 1)))
            
            # Engagement: based on check-ins and check-outs
            check_ins = sum(1 for log in logs if log.get('check_in_time'))
            check_outs = sum(1 for log in logs if log.get('check_out_time'))
            engagement_score = (check_ins + check_outs) / (max(total_registered, 1) * 2)
            
            # Event diversity: variety of events attended
            events_attended = set(log.get('event_id') for log in logs if log.get('event_id'))
            event_diversity = min(len(events_attended) / 10.0, 1.0)
            
            features = ParticipantFeatures(
                participant_id=int(pid),
                name=p.get('name', f'ID {pid}'),
                attendance_rate=round(attendance_rate, 4),
                punctuality_score=round(punctuality_score, 4),
                engagement_score=round(engagement_score, 4),
                event_diversity=round(event_diversity, 4),
                avg_lateness_minutes=round(avg_lateness, 2),
                total_events_registered=total_registered,
                total_events_attended=verified_count,
                late_checkins=late_count,
                early_checkins=early_count
            )
            
            features_by_id[pid] = features
            features_list.append({
                'participant_id': pid,
                'name': features.name,
                'attendance_rate': features.attendance_rate,
                'punctuality_score': features.punctuality_score,
                'engagement_score': features.engagement_score,
                'event_diversity': features.event_diversity,
                'avg_lateness_minutes': features.avg_lateness_minutes
            })
        
        return pd.DataFrame(features_list), features_by_id
    
    def preprocess_features(self, df: pd.DataFrame) -> np.ndarray:
        """
        Preprocess and scale features for clustering.
        
        Uses RobustScaler to handle outliers in attendance data.
        Normalizes avg_lateness_minutes separately since it has different scale.
        """
        from sklearn.preprocessing import RobustScaler, MinMaxScaler
        
        if df.empty:
            return np.array([])
        
        # Extract features for scaling
        feature_df = df[self.FEATURE_COLUMNS].copy()
        
        # Normalize avg_lateness_minutes to 0-1 scale (cap at 120 minutes = 2 hours late)
        feature_df['avg_lateness_minutes'] = feature_df['avg_lateness_minutes'].clip(0, 120) / 120.0
        
        # Apply robust scaling to handle outliers
        scaler = RobustScaler()
        scaled_features = scaler.fit_transform(feature_df)
        
        return scaled_features
    
    def fit_predict(self, X: np.ndarray) -> np.ndarray:
        """
        Perform K-means clustering on preprocessed features.
        
        Args:
            X: Preprocessed feature matrix
            
        Returns:
            Cluster labels for each participant
        """
        if X.size == 0 or len(X) < self.n_clusters:
            return np.array([])
        
        try:
            from sklearn.cluster import KMeans
            from sklearn.metrics import silhouette_score
            
            # Initialize and fit K-means with k-means++ initialization
            self._model = KMeans(
                n_clusters=self.n_clusters,
                init='k-means++',
                n_init=10,
                max_iter=300,
                random_state=self.random_state
            )
            
            labels = self._model.fit_predict(X)
            
            # Log silhouette score for cluster quality assessment
            if len(set(labels)) > 1:
                sil_score = silhouette_score(X, labels)
                logger.info(f"Silhouette score: {sil_score:.4f}")
            
            return labels
            
        except ImportError:
            logger.warning("sklearn not available, using fallback implementation")
            return self._fallback_clustering(X)
    
    def _fallback_clustering(self, X: np.ndarray) -> np.ndarray:
        """
        Fallback pure-Python K-means implementation.
        Used when sklearn is not installed.
        """
        if X.size == 0:
            return np.array([])
        
        np.random.seed(self.random_state)
        n_samples = X.shape[0]
        
        # Initialize centroids using k-means++ logic
        centroids = self._kmeans_plus_plus_init(X)
        
        # Iterate to convergence
        for _ in range(100):
            # Assign points to nearest centroid
            distances = np.array([[np.linalg.norm(x - c) for c in centroids] for x in X])
            labels = np.argmin(distances, axis=1)
            
            # Update centroids
            new_centroids = []
            for i in range(self.n_clusters):
                cluster_points = X[labels == i]
                if len(cluster_points) > 0:
                    new_centroids.append(cluster_points.mean(axis=0))
                else:
                    new_centroids.append(centroids[i])
            
            # Check convergence
            if np.allclose(centroids, new_centroids):
                break
            centroids = new_centroids
        
        return labels
    
    def _kmeans_plus_plus_init(self, X: np.ndarray) -> List[np.ndarray]:
        """K-means++ centroid initialization."""
        centroids = [X[np.random.randint(0, len(X))]]
        
        while len(centroids) < self.n_clusters:
            distances = np.array([
                min(np.linalg.norm(x - c) ** 2 for c in centroids)
                for x in X
            ])
            probs = distances / distances.sum()
            cumulative = np.cumsum(probs)
            r = np.random.random()
            idx = np.searchsorted(cumulative, r)
            centroids.append(X[idx])
        
        return centroids
    
    def calculate_performance_scores(
        self, 
        features: Dict[int, ParticipantFeatures],
        labels: np.ndarray
    ) -> List[ClusterResult]:
        """
        Calculate performance scores for each cluster.
        
        Uses weighted feature scoring to determine cluster performance.
        """
        results = []
        pid_to_idx = {pid: idx for idx, pid in enumerate(features.keys())}
        
        for cluster_id in range(self.n_clusters):
            member_indices = np.where(labels == cluster_id)[0]
            member_pids = [list(features.keys())[i] for i in member_indices]
            
            if not member_pids:
                continue
            
            # Calculate average weighted score for cluster
            member_scores = []
            for pid in member_pids:
                f = features[pid]
                # Normalize avg_lateness_minutes to 0-1 scale for weighted scoring
                normalized_lateness = min(f.avg_lateness_minutes / 120.0, 1.0)  # Cap at 120 minutes
                score = (
                    f.attendance_rate * self._feature_weights['attendance_rate'] +
                    f.punctuality_score * self._feature_weights['punctuality_score'] +
                    f.engagement_score * self._feature_weights['engagement_score'] +
                    f.event_diversity * self._feature_weights['event_diversity'] +
                    (1 - normalized_lateness) * self._feature_weights['avg_lateness_minutes']
                )
                member_scores.append(score)
            
            avg_score = np.mean(member_scores) if member_scores else 0.0
            
            # Calculate centroid features
            member_features = [features[pid] for pid in member_pids]
            centroid = {
                'attendance_rate': np.mean([f.attendance_rate for f in member_features]),
                'punctuality_score': np.mean([f.punctuality_score for f in member_features]),
                'engagement_score': np.mean([f.engagement_score for f in member_features]),
                'event_diversity': np.mean([f.event_diversity for f in member_features]),
                'avg_lateness_minutes': np.mean([f.avg_lateness_minutes for f in member_features])
            }
            
            label = self.CLUSTER_LABELS[cluster_id] if cluster_id < len(self.CLUSTER_LABELS) else f"Cluster {cluster_id}"
            
            results.append(ClusterResult(
                cluster_id=cluster_id,
                label=label,
                performance_score=round(avg_score * 100, 2),
                member_ids=[int(p) for p in member_pids],
                member_names=[features[p].name for p in member_pids],
                centroid={k: round(v, 4) for k, v in centroid.items()},
                size=len(member_pids)
            ))
        
        # Sort by performance score descending
        results.sort(key=lambda x: x.performance_score, reverse=True)
        return results
    
    def cluster(
        self, 
        participants: List[Dict[str, Any]], 
        attendance_logs: List[Dict[str, Any]],
        event_start_times: Optional[Dict[int, str]] = None
    ) -> Dict[str, Any]:
        """
        Main clustering method. Extracts features, preprocesses, and clusters.
        
        Args:
            participants: List of participant records
            attendance_logs: List of attendance records
            event_start_times: Optional dict mapping event_id to start time
            
        Returns:
            Clustering results with cluster assignments and summary
        """
        # Extract features
        df, features = self.extract_features(participants, attendance_logs, event_start_times)
        
        if df.empty:
            return {
                'clusters': [],
                'summary': {'high_performers': 0, 'moderate_performers': 0, 'low_performers': 0},
                'totalParticipants': len(participants),
                'generatedAt': datetime.now().isoformat()
            }
        
        # Preprocess features
        X = self.preprocess_features(df)
        
        # Fit and predict clusters
        labels = self.fit_predict(X)
        
        if len(labels) == 0:
            return {
                'clusters': [],
                'summary': {'high_performers': 0, 'moderate_performers': 0, 'low_performers': 0},
                'totalParticipants': len(participants),
                'generatedAt': datetime.now().isoformat()
            }
        
        # Calculate cluster performance scores
        cluster_results = self.calculate_performance_scores(features, labels)
        
        # Generate summary
        summary = {
            'high_performers': 0,
            'moderate_performers': 0,
            'low_performers': 0
        }
        
        for cr in cluster_results:
            key = cr.label.lower().replace(' ', '_')
            if key in summary:
                summary[key] = cr.size
        
        return {
            'clusters': [asdict(r) for r in cluster_results],
            'summary': summary,
            'totalParticipants': len(participants),
            'generatedAt': datetime.now().isoformat(),
            'featureStats': {
                'mean': {col: float(df[col].mean()) for col in self.FEATURE_COLUMNS},
                'std': {col: float(df[col].std()) for col in self.FEATURE_COLUMNS}
            }
        }


def evaluate_feature_suitability(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Evaluate the suitability of features for clustering.
    
    Checks:
    1. Variance - features should have meaningful variance
    2. Scale - features should be comparable after normalization
    3. Correlation - features should be somewhat independent
    """
    import warnings
    warnings.filterwarnings('ignore')
    
    results = {
        'variance_check': {},
        'scale_check': {},
        'correlation_check': {},
        'recommendations': []
    }
    
    for col in df.columns:
        if col in ['participant_id', 'name']:
            continue
        
        values = df[col].dropna()
        variance = values.var()
        results['variance_check'][col] = {
            'variance': float(variance),
            'suitable': variance > 0.01,
            'message': 'Good variance' if variance > 0.01 else 'Low variance - may not contribute to clustering'
        }
        
        results['scale_check'][col] = {
            'min': float(values.min()),
            'max': float(values.max()),
            'range': float(values.max() - values.min()),
            'suitable': True,
            'message': 'Can be normalized'
        }
    
    # Check correlations
    numeric_cols = [c for c in df.columns if c not in ['participant_id', 'name']]
    if len(numeric_cols) > 1:
        corr_matrix = df[numeric_cols].corr()
        high_corr_pairs = []
        for i, col1 in enumerate(numeric_cols):
            for col2 in numeric_cols[i+1:]:
                corr = abs(corr_matrix.loc[col1, col2])
                if corr > 0.8:
                    high_corr_pairs.append((col1, col2, float(corr)))
        
        results['correlation_check'] = {
            'high_correlation_pairs': high_corr_pairs,
            'suitable': len(high_corr_pairs) < len(numeric_cols) / 2,
            'message': 'Some features are highly correlated - consider dimensionality reduction' if high_corr_pairs else 'Good feature independence'
        }
    
    return results


# Example usage with test data
if __name__ == '__main__':
    # Sample test data
    test_participants = [
        {'participant_id': 1, 'name': 'Alice Johnson', 'rfid': 'A001'},
        {'participant_id': 2, 'name': 'Bob Smith', 'rfid': 'B002'},
        {'participant_id': 3, 'name': 'Charlie Brown', 'rfid': 'C003'},
        {'participant_id': 4, 'name': 'Diana Ross', 'rfid': 'D004'},
        {'participant_id': 5, 'name': 'Eve Wilson', 'rfid': 'E005'},
        {'participant_id': 6, 'name': 'Frank Miller', 'rfid': 'F006'},
    ]
    
    # Event start times (format: "HH:MM")
    event_start_times = {
        1: '09:00',  # Event 1 starts at 9:00 AM
        2: '09:00',  # Event 2 starts at 9:00 AM
        3: '09:00',  # Event 3 starts at 9:00 AM
    }
    
    # Simulate varied attendance patterns
    test_attendance = [
        # Alice - High performer: good attendance, punctual, engaged
        {'participant_id': 1, 'event_id': 1, 'verified': True, 'check_in_time': '2026-06-17T09:00:00', 'check_out_time': '2026-06-17T11:00:00'},
        {'participant_id': 1, 'event_id': 2, 'verified': True, 'check_in_time': '2026-06-18T08:55:00', 'check_out_time': '2026-06-18T10:55:00'},
        {'participant_id': 1, 'event_id': 3, 'verified': True, 'check_in_time': '2026-06-19T09:10:00', 'check_out_time': '2026-06-19T11:10:00'},
        
        # Bob - Moderate: good attendance, some lateness (20 min late to first event)
        {'participant_id': 2, 'event_id': 1, 'verified': True, 'check_in_time': '2026-06-17T09:20:00', 'check_out_time': '2026-06-17T11:20:00'},
        {'participant_id': 2, 'event_id': 2, 'verified': True, 'check_in_time': '2026-06-18T09:00:00', 'check_out_time': '2026-06-18T11:00:00'},
        
        # Charlie - Low performer: poor attendance (not verified, late check-in)
        {'participant_id': 3, 'event_id': 1, 'verified': False, 'check_in_time': '2026-06-17T10:00:00', 'check_out_time': None},
        {'participant_id': 3, 'event_id': 2, 'verified': False, 'check_in_time': None, 'check_out_time': None},
        
        # Diana - High performer: excellent punctuality (early check-in)
        {'participant_id': 4, 'event_id': 1, 'verified': True, 'check_in_time': '2026-06-17T08:45:00', 'check_out_time': '2026-06-17T10:45:00'},
        {'participant_id': 4, 'event_id': 2, 'verified': True, 'check_in_time': '2026-06-18T08:50:00', 'check_out_time': '2026-06-18T10:50:00'},
        {'participant_id': 4, 'event_id': 3, 'verified': True, 'check_in_time': '2026-06-19T08:55:00', 'check_out_time': '2026-06-19T10:55:00'},
        
        # Eve - Low: late arrivals (45-60 min late to events)
        {'participant_id': 5, 'event_id': 1, 'verified': True, 'check_in_time': '2026-06-17T10:00:00', 'check_out_time': '2026-06-17T12:00:00'},
        {'participant_id': 5, 'event_id': 2, 'verified': True, 'check_in_time': '2026-06-18T09:45:00', 'check_out_time': '2026-06-18T11:45:00'},
        
        # Frank - New: no attendance yet
        {'participant_id': 6, 'event_id': 1, 'verified': False, 'check_in_time': None, 'check_out_time': None},
    ]
    
    # Run clustering
    model = PerformanceClusteringModel(n_clusters=3)
    result = model.cluster(test_participants, test_attendance, event_start_times)
    
    print("=== Performance Clustering Results ===")
    print(json.dumps(result, indent=2))