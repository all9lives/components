import {
  omit,
  append,
  set,
  get,
  or,
  pick,
  reduce,
  equals,
  walkReduceDepthFirst
} from '@serverless/utils'
import { pickComponentProps } from './utils'

// TODO: move this into @serverless/utils ?!
import isTypeConstruct from '../../../dist/utils/type/isTypeConstruct'

const DEPLOY = 'deploy'

const Component = (SuperClass) =>
  class extends SuperClass {
    async construct(inputs, context) {
      await super.construct(inputs, context)

      // TODO BRN: this is not the best solution, this is causing problems
      this.instanceId = context.generateInstanceId()
      this.components = or(get('components', inputs), this.components, {})
    }

    equals(value) {
      return value.instanceId === this.instanceId
    }

    // sync method is optional
    // the default is that we never check the provider
    // so we return 'unknown' as the status
    sync() {
      return 'unknown'
    }

    hydrate(previousInstance) {
      this.instanceId = or(get('instanceId', previousInstance), this.instanceId)
    }

    async define() {
      // `components` are omitted because they are re-included in the return statement
      // `parent` is omitted since this value is already resolved and considering it causes infinite loops
      const filteredInstance = omit(['components', 'parent'], this)

      const componentDefinitions = walkReduceDepthFirst(
        (accum, value, pathParts) => {
          if (isTypeConstruct(value)) {
            return set(pathParts, value, accum)
          }
          return accum
        },
        {},
        filteredInstance
      )

      return {
        ...componentDefinitions,
        ...or(this.components, {})
      }
    }

    shouldDeploy(prevInstance) {
      if (!prevInstance) {
        return DEPLOY
      }

      const prevProps = pickComponentProps(prevInstance)
      const nextProps = pickComponentProps(this)

      if (!equals(prevProps, nextProps)) {
        return DEPLOY
      }
    }

    async deploy() {}

    async remove() {}

    async info() {
      const children = await reduce(
        async (accum, component) => append(await component.info(), accum),
        [],
        or(this.components, {})
      )
      return {
        title: this.name,
        type: this.name,
        data: pick(['name', 'license', 'version'], this),
        children
      }
    }

    toString() {
      return `${this['@@key']} ${this.name} {  }`
    }
  }

export default Component
