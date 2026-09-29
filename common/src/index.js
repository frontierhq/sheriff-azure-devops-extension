function buildBaseArgs(command, mode, configDir, licenceFilePath, subscriptionId) {
  return [
    command,
    mode,
    configDir ? '--config-dir' : '',
    configDir,
    licenceFilePath ? '--licence-file' : '',
    licenceFilePath,
    '--subscription-id',
    subscriptionId,
  ];
}

function getErrorMessage(err) {
  return err instanceof Error ? err.message : 'Unknown error';
}

module.exports = { buildBaseArgs, getErrorMessage };
