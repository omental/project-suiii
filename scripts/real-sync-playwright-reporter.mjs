class RealSyncReporter {
  onTestEnd(test, result) {
    const title = test.titlePath().join(" > ");
    const retry = result.retry ? ` retry=${result.retry}` : "";
    process.stdout.write(`[real-sync ${new Date().toISOString()}] Playwright test completed: ${result.status}${retry} duration=${result.duration}ms ${title}\n`);
  }
}

export default RealSyncReporter;
