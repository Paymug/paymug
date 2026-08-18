export interface AppDeploymentInfo {
  version: string;
  repository: string;
  commitSha: string;
  releaseSha: string;
  commitUrl?: string;
}
