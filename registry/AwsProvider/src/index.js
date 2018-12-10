import { assoc, isEmpty, reduce, resolve } from '@serverless/utils'
import AWS from 'aws-sdk'

function resolveCredentials(credentials) {
  return reduce((accum, value, key) => assoc(key, resolve(value), accum), {}, credentials)
}

const AwsProvider = (SuperClass) =>
  class extends SuperClass {
    async construct(inputs, context) {
      await super.construct(inputs, context)

      // NOTE: we cannot use `resolvable` or `resolve` here since AwsProvider doesn't extend Component
      this.region = inputs.region || 'us-east-1'
      this.credentials = inputs.credentials
    }

    getSdk() {
      this.validate()
      // TODO BRN: This won't work for multi provider/region
      AWS.config.update({ region: this.region, credentials: resolveCredentials(this.credentials) })
      return AWS
    }

    getCredentials() {
      this.validate()
      return { region: this.region, credentials: resolveCredentials(this.credentials) }
    }

    validate() {
      const region = this.region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION
      const envCredSet = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY

      if (!/.+-.+.\d+/.test(region)) {
        throw new Error(`Invalid region "${region}" in your AWS provider setup`)
      }

      if ((!this.credentials || isEmpty(this.credentials)) && !envCredSet) {
        throw new Error(`Credentials not set in your AWS provider setup`)
      }
    }
  }

export default AwsProvider
