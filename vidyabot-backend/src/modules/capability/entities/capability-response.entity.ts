import { CapabilityCluster } from '../../../common/enums/capability-cluster.enum';

export class CapabilityResponse {
    id: string;
    grade: number;
    chapter: string;
    capability_cluster: CapabilityCluster;
    question_hash: string;
    response_text: string;
    usage_count: number;
}
