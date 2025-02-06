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
    <img src="https://img.shields.io/github/actions/workflow/status/orangebeard-io/javascript-client/release.yml?branch=main&style=flat-square"
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
  
Usually, the client is used from a listener that connects the client to a test tool. Listeners can provide their own OrangebeardParameters object.  
If no configuration object is provided, the client will try to auto-configure in the following ways: 

### orangebeard.json

Look for a config file named `orangebeard.json` in the current working directory or higher in the hierarchy (it will scan all the way up to `/`). The json file is expected to contain an OrangebeardParameters object: 
 ```json
 {
	"endpoint": "https://my.orangebeard.app",
	"token": "xxxxxxxxxxxxx-xxxx-xxxx-xxxxxxxxxxxx",
	"project": "my-project",
	"testset": "Test set name",
	"description": "Test run description",
	"attributes": [
		{
			"key": "Key 1",
			"value": "Some value"
		},
		{
			"value": "Tag value"
		}
	],
    "referenceUrl": "https://my-ref-url.tld/ref" 
}
```

### Environment variables
The auto config will scan for environment variables:

 ```shell
 ORANGEBEARD_ENDPOINT=https://company.orangebeard.app
 ORANGEBEARD_TOKEN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 ORANGEBEARD_PROJECT=piet_personal
 ORANGEBEARD_TESTSET=piet_TEST_EXAMPLE
 ORANGEBEARD_DESCRIPTION=My awesome testrun
 ORANGEBEARD_ATTRIBUTES=key:value; value;
 ORANGEBEARD_REFERENCE_URL=https://my-ref-url.tld/ref
 ```
 Note that if auto configuration is used and a value is present in both orangebeard.json and in the environment settings, the environment setting will take precedence.
