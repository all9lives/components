import path from 'path'
import describeTable from './describeTable'
import { createTestContext } from '../../../../test'

beforeEach(() => {
  jest.clearAllMocks()
})

afterAll(() => {
  jest.restoreAllMocks()
})

describe('#describeTable()', () => {
  const cwd = path.resolve(__dirname, '..', '..')
  let context
  let provider

  beforeEach(async () => {
    context = await createTestContext({ cwd })
    const AwsProvider = await context.import('AwsProvider')
    provider = await context.construct(AwsProvider, {
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'abc',
        secretAccessKey: 'xyz'
      }
    })
  })

  it('should return table information', async () => {
    const properties = {
      provider,
      tableName: 'describe-table'
    }

    const res = await describeTable(properties)

    expect(res).toEqual({
      Table: {
        TableArn: 'arn:aws:dynamodb:region:XXXXX:table/describe-table',
        TableName: 'describe-table',
        TableStatus: 'ACTIVE'
      }
    })
  })
})
