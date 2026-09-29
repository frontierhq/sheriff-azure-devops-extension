#!/bin/env node

const fs = require('fs-extra');
const path = require('path');
const tempdir = require('tempdir');
const { rimraf } = require('rimraf');

const exec = require('./helpers/exec');

const build = async () => {
  const version = process.argv[2];
  const outputsFilePath = process.argv[3];

  const isPreRelease = version.endsWith('-pre');
  const numbersOnlyVersion = version.replace('v', '');

  const tempDirPath = await tempdir();

  await rimraf(tempDirPath);

  const manifestDefinition = JSON.parse(await fs.promises.readFile(path.join(process.cwd(), 'vss-extension.json'), 'utf8'));

  const pathsToCopy = [
    'common',
    'images',
    'overview.md',
    'package-lock.json',
    'package.json',
    'tasks',
    'vss-extension.json',
  ];
  await Promise.all(
    pathsToCopy.map(
      (pathToCopy) => fs.copy(
        path.join(process.cwd(), pathToCopy),
        path.join(tempDirPath, pathToCopy),
        {
          filter: (src) => !src.includes('node_modules'),
        },
      ),
    ),
  );

  await exec(`npm --prefix ${tempDirPath} ci`);

  await Promise.all(manifestDefinition.files.map(async (file) => {
    const findResult = await exec(`find ${path.join(tempDirPath, file.path)} -type f -name package.json -maxdepth 3 -exec dirname {} \\;`);
    const taskDirPaths = findResult.trim().split('\n');
    await Promise.all(taskDirPaths.map(async (taskDirPath) => {
      await exec(`npm --prefix ${taskDirPath} ci --omit=dev --install-links`);

      const taskPackageDefinition = JSON.parse(await fs.readFile(path.join(taskDirPath, 'package.json'), 'utf8'));

      const taskDefinition = JSON.parse(await fs.readFile(path.join(taskDirPath, 'task.json'), 'utf8'));
      taskDefinition.version = {
        Major: parseInt(taskPackageDefinition.version.split('.')[0], 10),
        Minor: parseInt(taskPackageDefinition.version.split('.')[1], 10),
        Patch: parseInt(taskPackageDefinition.version.split('.')[2], 10),
      };

      await fs.writeFile(path.join(taskDirPath, 'task.json'), JSON.stringify(taskDefinition, null, 2));
    }));
  }));

  const override = {
    id: isPreRelease ? `${manifestDefinition.id}PreRelease` : manifestDefinition.id,
    name: isPreRelease ? `${manifestDefinition.name} (Pre-Release)` : manifestDefinition.name,
    version: isPreRelease ? numbersOnlyVersion.split('-')[0] : numbersOnlyVersion,
    public: !isPreRelease,
  };

  const stdout = await exec(
    [
      'npx tfx extension create',
      `--override '${JSON.stringify(override)}'`,
      `--output-path "${path.join(process.cwd(), 'dist')}"`,
    ].join(' '),
    {
      cwd: tempDirPath,
      silent: false,
    },
  );

  const stdoutLines = stdout.split('\n');
  const vsixFilePath = stdoutLines[4].split(':')[1].trim();
  const vsixFileName = vsixFilePath.split('/').pop();

  await rimraf(tempDirPath);

  await fs.appendFile(outputsFilePath, `is_pre_release=${isPreRelease}\n`);
  await fs.appendFile(outputsFilePath, `vsix_file_name=${vsixFileName}\n`);
};

build();
