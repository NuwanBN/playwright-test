const { execSync } = require('child_process')
fs = require('fs')
path = require('path')
loadEnv()
const baseURL = "https://dev-portal.ordino.ai";
const args = process.argv.slice(2)
function ordinoEngine() {
  const { oi } = require('@ordino.ai/ordino-engine');
  return oi;
}
function getFrameworkVersion() {
  const dir = path.join(__dirname, 'package.json')
  if (!fs.existsSync(dir)) {
    throw new Error('package.json file not found')
  }
  const packageJson = JSON.parse(fs.readFileSync(dir, 'utf8'))
  dependency = packageJson.devDependencies?.['@ordino.ai/ordino-engine']
  if (!dependency) {
    throw new Error(
      '@ordino.ai/ordino-engine version not found in package.json'
    )
  }
  return dependency
}

async function getToken(apiKey, frameworkVersion) {
  try {
    const res = await fetch(
      `${baseURL}/api/v1/npm-repo-external/${frameworkVersion}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Ordino-Key': apiKey
        }
      }
    )
    if (!res.ok) {
      throw new Error('HTTP error! Status: ' + res.status)
    }
    const resContent = await res.json();
    if (resContent.extraInfo == null) {
      throw new Error('Empty token received')
    }
    return resContent.extraInfo
  } catch (error) {
    throw new Error(
      'Your token may have expired or be incorrect. Kindly reach out to Ordino support for assistance.: ' +
      error.message
    )
  }
}

async function getConfig() {
  const ordinoKey = process.env.ORDINO_KEY
  if (!ordinoKey) {
    throw new Error('API key is missing in environment variables')
  }
  const frameworkVersion = getFrameworkVersion()
  token = await getToken(ordinoKey, frameworkVersion);
  return {
    apiKey: ordinoKey,
    token: token,
  }
}
function deletePackageLock() {
  const packageLock = path.join(process.cwd(), 'package-lock.json')
  if (fs.existsSync(packageLock)) {
    try {
      fs.unlinkSync(packageLock)
    } catch (error) {
      process.exit(1)
    }
  }
}
async function runI() {
  try {
    deletePackageLock()
    const config = await getConfig()
    const commandArgs = args
      .filter((filter) => filter !== '--initialize')
      .join(' ')
    execSync(
      'npm install --registry=https://registry.npmjs.org/ --//registry.npmjs.org/:_authToken=' +
      config.token +
      ' ' +
      commandArgs,
      { stdio: 'inherit' }
    )
  } catch (error) {
    console.error('Error during installation:', error.message)
    process.exit(1)
  }
}

async function runTest(isAuthenticated) {
  try {
    const childEnv = {
      ...process.env,
      ORDINO_AUTHENTICATED: isAuthenticated
    };
    const commandArgs = args
      .filter((filter) => filter !== '--runTest')
      .join(' ')
    execSync('npx playwright test --config=ordino.config.ts ' + commandArgs, {
      stdio: 'inherit',
      env: childEnv
    })
  } catch (error) {
    console.error(error.message)
  }
}
async function openTest(isAuthenticated) {
  try {
    const childEnv = {
      ...process.env,
      ORDINO_AUTHENTICATED: isAuthenticated
    };
    const commandArgs = args
      .filter((filter) => filter !== '--openTest')
      .join(' ')
    execSync('npx playwright test --headed --config=ordino.config.ts ' + commandArgs, {
      stdio: 'inherit',
      env: childEnv
    })
  } catch (error) {
    console.error(error.message)
  }
}
async function debugTest(isAuthenticated) {
  try {
    const childEnv = {
      ...process.env,
      ORDINO_AUTHENTICATED: isAuthenticated
    };
    const commandArgs = args
      .filter((filter) => filter !== '--ui')
      .join(' ')
    execSync('npx playwright test --ui --config=ordino.config.ts ' + commandArgs, {
      stdio: 'inherit',
      env: childEnv
    })
  } catch (error) {
    console.error(error.message)
  }
}
async function openReport(isAuthenticated) {
  try {
    const childEnv = {
      ...process.env,
      ORDINO_AUTHENTICATED: isAuthenticated
    };
    const commandArgs = args
      .filter((filter) => filter !== '--openReport')
      .join(' ')
    execSync('npx allure generate allure-results --clean -o ordino-report/allure-report && move allure-results ordino-report/ 2>nul || true && allure serve ./ordino-report && allure generate ./ordino-report/allure-results ' + commandArgs, {
      stdio: 'inherit',
      env: childEnv
    })
    execSync('npx allure open ordino-report/allure-report', {
      stdio: 'inherit',
      env: childEnv
    })
  } catch (error) {
    console.error(error.message)
  }
}

function loadEnv(environment = '.env') {
  try {
    const envPath = path.resolve(environment)
    if (process.env.ORDINO_KEY && process.env.ORDINO_KEY != undefined && process.env.ORDINO_KEY != "$ORDINO_KEY") {
      console.log('Using environment variables from CI/CD.')
      return
    }
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      envData = envContent.split('\n')
      envData.forEach((data) => {
        if (data.trim() && data.startsWith('ORDINO_KEY')) {
          const envKey = data.substr(0, data.indexOf('=')).trim();
          const envValue = data.substr(data.indexOf('=') + 1).trim();
          process.env[envKey] = envValue;
        }
      })
    } else {
      console.log('No .env file found. Using CI/CD environment variables.')
    }
  } catch (error) {
    console.error('Error loading .env file:', error.message)
  }
}

async function convertToMochawesome() {
  try {
    console.log('Converting test results to Mochawesome format...');
    execSync('node convert-to-mochawesome.js', {
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Error converting to Mochawesome:', error.message);
    // Try fallback to original conversion
    try {
      const enginePackageRoot = path.dirname(require.resolve('@ordino.ai/ordino-engine/package.json'));
      const pathToScript = path.join(enginePackageRoot, 'cloud-test', 'convert-to-mochawesome.js');
      execSync(`node ${pathToScript}`, {
        stdio: 'inherit',
      });
    } catch (fallbackError) {
      console.error('Fallback conversion also failed:', fallbackError.message);
    }
  }
}

if (args.includes('--initialize')) {
  runI()
} else {
  if (args.includes('--runTest')) {
    require('dotenv').config();
    ordinoEngine().authenticate()
      .then(isAuthenticated => {
        runTest(isAuthenticated);
        convertToMochawesome();
      });
  } else if (args.includes('--openTest')) {
    require('dotenv').config();
    ordinoEngine().authenticate()
      .then(isAuthenticated => {
        openTest(isAuthenticated);
        convertToMochawesome();
      });
  } else if (args.includes('--debugTest')) {
    require('dotenv').config();
    ordinoEngine().authenticate()
      .then(isAuthenticated => {
        debugTest(isAuthenticated);
      });
  } else if (args.includes('--openReport')) {
    require('dotenv').config();
    ordinoEngine().authenticate()
      .then(isAuthenticated => {
        openReport(isAuthenticated);
      });
  }
}