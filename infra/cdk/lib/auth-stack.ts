import { Stack, type StackProps, RemovalPolicy, CfnOutput } from "aws-cdk-lib";
import type { UserPoolClient} from "aws-cdk-lib/aws-cognito";
import { UserPool, AccountRecovery } from "aws-cdk-lib/aws-cognito";
import type { Construct } from "constructs";

export class AuthStack extends Stack {
  public readonly userPool: UserPool;
  public readonly userPoolClient: UserPoolClient;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.userPool = new UserPool(this, "UserPool", {
      userPoolName: "boot-camp-users",
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.userPoolClient = this.userPool.addClient("AppClient", {
      userPoolClientName: "boot-camp-web",
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
    });

    new CfnOutput(this, "UserPoolId", { value: this.userPool.userPoolId });
    new CfnOutput(this, "UserPoolClientId", { value: this.userPoolClient.userPoolClientId });
  }
}
