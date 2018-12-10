import { get, keys, or, pick, resolve, resolvable, equals, not } from '@serverless/utils'
import { createTable, updateTable, deleteTable, describeTable, ensureTable } from './utils'

const AwsDynamoDb = (SuperClass) =>
  class extends SuperClass {
    async construct(inputs, context) {
      await super.construct(inputs, context)

      this.tableName = resolvable(() => or(inputs.tableName, `table-${this.instanceId}`))
      this.provider = resolvable(() => or(inputs.provider, context.get('provider')))
    }

    shouldDeploy(prevInstance) {
      const inputs = {
        attributeDefinitions: this.attributeDefinitions,
        provisionedThroughput: this.provisionedThroughput,
        globalSecondaryIndexes: this.globalSecondaryIndexes,
        sseSpecification: this.sseSpecification,
        streamSpecification: this.streamSpecification
      }
      const prevInputs = prevInstance ? pick(keys(inputs), prevInstance) : {}
      const configChanged = not(equals(inputs, prevInputs))

      if (!prevInstance || configChanged) {
        return 'deploy'
      } else if (
        prevInstance.tableName !== this.tableName ||
        not(equals(prevInstance.keySchema, this.keySchema))
      ) {
        return 'replace'
      }
    }

    async sync() {
      let { provider, tableName } = this
      provider = resolve(provider)
      tableName = resolve(tableName)

      try {
        await describeTable({ provider, tableName })
      } catch (error) {
        if (error.code === 'ResourceNotFoundException') {
          return 'removed'
        }
        throw error
      }
    }

    async deploy(prevInstance, context) {
      const tableName = get('tableName', this)
      if (
        prevInstance &&
        (not(equals(prevInstance.attributeDefinitions, this.attributeDefinitions)) ||
          not(equals(prevInstance.provisionedThroughput, this.provisionedThroughput)) ||
          not(equals(prevInstance.globalSecondaryIndexes, this.globalSecondaryIndexes)) ||
          not(equals(prevInstance.sseSpecification, this.sseSpecification)) ||
          not(equals(prevInstance.streamSpecification, this.streamSpecification)))
      ) {
        context.log(`Updating table: '${tableName}'`)
        if (not(equals(prevInstance.globalSecondaryIndexes, this.globalSecondaryIndexes))) {
          context.log(
            `Skipping GlobalSecondaryIndex updates for table '${tableName}' (currently not supported)`
          )
        }
        await ensureTable(updateTable, this)
        context.log(`Table updated: '${tableName}'`)
      } else {
        context.log(`Creating table: '${tableName}'`)
        await ensureTable(createTable, this)
        context.log(`Table created: '${tableName}'`)
      }
    }

    async remove(context) {
      context.log(`Removing table: '${this.tableName}'`)
      await deleteTable(this)
    }

    async info() {
      return {
        title: this.name,
        type: this.name,
        data: pick(['name', 'license', 'version', 'tableName'], this)
      }
    }
  }

export default AwsDynamoDb
