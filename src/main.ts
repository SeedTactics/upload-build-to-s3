import * as core from "@actions/core";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readFile } from "fs";
import { promisify } from "util";
import { basename } from "path";
import { exec } from "child_process";
const readFileAsync = promisify(readFile);
const execAsync = promisify(exec);

async function updateDownloadsYml(type: string, bucket_file: string, downloads: string): Promise<string> {
  downloads += "\n";
  downloads += ` - date: ${new Date().toISOString()}\n`;
  downloads += `   type: ${type}\n`;
  downloads += `   name: ${basename(bucket_file)}\n`;
  downloads += `   bucketPath: ${bucket_file}\n`;

  const log = await execAsync(`git log -1 --pretty=%b`);

  const paragraphs = [];
  let curParagraph = "";
  for (const line of log.stdout.split(/\r?\n/)) {
    const lineTrimmed = line.trim();
    if (lineTrimmed === "") {
      if (curParagraph !== "") {
        paragraphs.push(curParagraph);
        curParagraph = "";
      }
    } else {
      curParagraph += lineTrimmed + " ";
    }
  }
  if (curParagraph !== "") {
    paragraphs.push(curParagraph);
    curParagraph = "";
  }

  if (paragraphs.length > 0) {
    downloads += `   notes:\n`;
    for (const paragraph of paragraphs) {
      downloads += `     - '${paragraph.replace("'", "''")}'\n`;
    }
  }

  return downloads;
}

async function run(): Promise<void> {
  try {
    const aws_key = core.getInput("aws_key");
    const aws_secret = core.getInput("aws_secret");
    const s3_bucket = core.getInput("s3_bucket");
    const input_file = core.getInput("input_file");
    const bucket_file = core.getInput("bucket_file");
    const downloads_yml = core.getInput("downloads_yml");
    const type = core.getInput("type");

    const s3 = new S3Client({
      region: "us-west-2",
      credentials: {
        accessKeyId: aws_key,
        secretAccessKey: aws_secret,
      },
    });

    const oldDownloads = await s3.send(
      new GetObjectCommand({
        Bucket: s3_bucket,
        Key: downloads_yml,
      })
    );

    const oldDownloadsCt = oldDownloads.Body?.toString();
    if (oldDownloadsCt === undefined || oldDownloadsCt === "") {
      throw new Error("Unknown downloads file " + downloads_yml);
    }

    const newDownloads = await updateDownloadsYml(type, bucket_file, oldDownloadsCt);

    await s3.send(
      new PutObjectCommand({
        Bucket: s3_bucket,
        Key: bucket_file,
        Body: await readFileAsync(input_file),
      })
    );

    await s3.send(
      new PutObjectCommand({
        Bucket: s3_bucket,
        Key: downloads_yml,
        Body: newDownloads,
      })
    );
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();
