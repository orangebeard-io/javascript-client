import OrangebeardAsyncV3Client from '../dist/client/OrangebeardAsyncV3Client';
import { StartTestRun } from '../dist/client/models/StartTestRun';
import { FinishTestRun } from '../dist/client/models/FinishTestRun';
import { StartSuite } from '../dist/client/models/StartSuite';
import { StartTest } from '../dist/client/models/StartTest';
import { FinishTest } from '../dist/client/models/FinishTest';
import { StartStep } from '../dist/client/models/StartStep';
import { FinishStep } from '../dist/client/models/FinishStep';
import { Log } from '../dist/client/models/Log';
import { Attachment } from '../dist/client/models/Attachment';
import * as fs from 'fs';
import LogFormat = Log.LogFormat;
import Status = FinishTest.Status;




const attachmentBytes = (filePath: string) => {
  try {
    return fs.readFileSync(filePath);
  } catch (err) {
    console.error('Error reading file:', err);
    throw err;
  }
}

async function runIntegrationTest() {
  const client = new OrangebeardAsyncV3Client();

  const testRunUUID = client.startTestRun({
    testSetName: 'Integration Test Run',
    startTime: new Date().toISOString(),
  } as StartTestRun)


  const suiteUUIDs = client.startSuite({
    testRunUUID: testRunUUID,
    suiteNames: ['Suite 1']
  } as StartSuite);



  const testUUID = client.startTest({
    testRunUUID: testRunUUID,
    suiteUUID: suiteUUIDs[0],
    testName: 'Test 1',
    testType: StartTest.TestType.TEST,
    startTime: new Date().toISOString(),
  } as StartTest);

  const stepUUID = client.startStep({
    testRunUUID: testRunUUID,
    testUUID: testUUID,
    stepName: 'Step 1',
    startTime: new Date().toISOString(),
  } as StartStep);


  const logUUID = client.log({
    testRunUUID: testRunUUID,
    testUUID: testUUID,
    stepUUID: stepUUID,
    logTime: new Date().toISOString(),
    message: 'Log message',
    logFormat: LogFormat.PLAIN_TEXT,
    logLevel: Log.LogLevel.INFO
  } as Log);




  client.sendAttachment({
    file: {
      name: 'attachment.png',
      content: attachmentBytes('./attachment.png'),
      contentType: 'image/png',
    },
    metaData: {
      testRunUUID: testRunUUID,
      testUUID: testUUID,
      stepUUID: stepUUID,
      logUUID: logUUID,
      attachmentTime: new Date().toISOString(),
    },
  } as Attachment);



  client.finishStep(stepUUID, {
    testRunUUID: testRunUUID,
    endTime: new Date().toISOString(),
    status: Status.PASSED,
  } as FinishStep);


  client.finishTest(testUUID, {
    testRunUUID: testRunUUID,
    endTime: new Date().toISOString(),
    status: Status.PASSED,
  } as FinishTest);


  await client.finishTestRun(testRunUUID, {
    endTime: new Date().toISOString(),
  } as FinishTestRun);

}

runIntegrationTest().catch((error) => {
  console.error('Error running integration test:', error);
  process.exit(1); // Indicate failure
});
