import { Stack, type StackProps, Duration } from "aws-cdk-lib";
import { Function, Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import type { Construct } from "constructs";

interface ApiStackProps extends StackProps {
  databaseSecretArn: string;
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const fn = new Function(this, "ApiFunction", {
      runtime: Runtime.NODEJS_20_X,
      handler: "dist/index.handler",
      code: Code.fromAsset("../../apps/api"),
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment: {
        NODE_ENV: "production",
        DATABASE_SECRET_ARN: props.databaseSecretArn,
      },
    });

    new LambdaRestApi(this, "ApiGateway", {
      handler: fn,
      proxy: true,
    });
  }
}
