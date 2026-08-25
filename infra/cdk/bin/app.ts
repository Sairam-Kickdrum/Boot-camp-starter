#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AuthStack } from "../lib/auth-stack.js";
import { DbStack } from "../lib/db-stack.js";
import { ApiStack } from "../lib/api-stack.js";
import { WebStack } from "../lib/web-stack.js";

const app = new cdk.App();
const env = { account: process.env["CDK_DEFAULT_ACCOUNT"], region: "us-east-1" };

new AuthStack(app, "BootCampAuth", { env });
const db = new DbStack(app, "BootCampDb", { env });

new ApiStack(app, "BootCampApi", {
  env,
  databaseSecretArn: db.cluster.secret?.secretArn ?? "",
});

new WebStack(app, "BootCampWeb", { env });
