import { Stack, type StackProps, RemovalPolicy } from "aws-cdk-lib";
import { Vpc, SubnetType } from "aws-cdk-lib/aws-ec2";
import {
  DatabaseCluster,
  DatabaseClusterEngine,
  AuroraPostgresEngineVersion,
  ClusterInstance,
} from "aws-cdk-lib/aws-rds";
import type { Construct } from "constructs";

export class DbStack extends Stack {
  public readonly cluster: DatabaseCluster;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 1,
    });

    this.cluster = new DatabaseCluster(this, "Database", {
      engine: DatabaseClusterEngine.auroraPostgres({
        version: AuroraPostgresEngineVersion.VER_16_1,
      }),
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 4,
      writer: ClusterInstance.serverlessV2("writer"),
      vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      defaultDatabaseName: "bootcamp",
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }
}
