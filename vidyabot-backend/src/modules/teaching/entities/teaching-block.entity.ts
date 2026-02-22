import { CapabilityCluster } from '../../../common/enums/capability-cluster.enum';

export class TeachingBlock {
    id: string;
    grade: number;
    subject: string;
    chapter: string;
    capability_cluster: CapabilityCluster;
    content: string;
    created_at: Date;
}
