<h1 align="center">
  <a href="https://github.com/orangebeard-io/javascript-client">
    <img src="https://raw.githubusercontent.com/orangebeard-io/javascript-client/main/.github/logo.svg" alt="Orangebeard.io JavaScript Client" height="200">
  </a>
  <br>Orangebeard.io JavaScript Client<br>
</h1>

<h4 align="center">Orangebeard client for Javascript.</h4>

<p align="center">
  <a href="https://www.npmjs.com/package/@orangebeard-io/javascript-client">
    <img src="https://img.shields.io/npm/v/@orangebeard-io/javascript-client.svg?style=flat-square"
      alt="NPM Version" />
  </a>
  <a href="https://github.com/orangebeard-io/javascript-client/actions">
    <img src="https://img.shields.io/github/workflow/status/orangebeard-io/javascript-client/release?style=flat-square"
      alt="Build Status" />
  </a>
  <a href="https://github.com/orangebeard-io/javascript-client/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/orangebeard-io/javascript-client?style=flat-square"
      alt="License" />
  </a>
</p>

<div align="center">
  <h4>
    <a href="https://orangebeard.io">Orangebeard</a> |
    <a href="#installation">Installation</a> |
    <a href="#configuration">Configuration</a>
  </h4>
</div>

## Installation

### Install the npm package

```shell
npm install --save-dev @orangebeard-io/javascript-client
```

## Build from source
```shell
npm run build
```
Make sure to have typescript installed.

## Configuration

Create a new file named `orangebeard.json` in the project root folder, next to `package.json`. Add the following entry:

```JSON
{
  "endpoint": "https://company.orangebeard.app",
  "accessToken": "00000000-0000-0000-0000-000000000000",
  "project": "project_name",
  "testset": "testset_NAME_EXAMPLE",
  "description": "Your description",
  "attributes": [
    {
      "key": "YourKey",
      "value": "YourValue"
    },
    {
      "value": "YourValue"
    }
  ]
}
```

### Environment properties

Properties can also be set in the build, by passing them as environment variables. It's important to mention that environment variables have precedence over the `orangebeard.json` definition.

```shell
$ export ORANGEBEARD_ENDPOINT=https://company.orangebeard.app
$ export ORANGEBEARD_ACCESSTOKEN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
$ export ORANGEBEARD_PROJECT=piet_personal
$ export ORANGEBEARD_TESTSET=piet_TEST_EXAMPLE
$ export ORANGEBEARD_DESCRIPTION=My awesome testrun
$ export ORANGEBEARD_ATTRIBUTES=key:value; value;
```
