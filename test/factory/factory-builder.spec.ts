/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { test } from '@japa/runner'
import { randomUUID } from 'crypto'
import { column } from '../../src/Orm/Decorators'
import { FactoryManager } from '../../src/Factory/index'
import { FactoryContext } from '../../src/Factory/FactoryContext'
import { FactoryBuilder } from '../../src/Factory/FactoryBuilder'

import {
  fs,
  setup,
  getDb,
  cleanup,
  ormAdapter,
  resetTables,
  getBaseModel,
  getFactoryModel,
  setupApplication,
} from '../../test-helpers'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

let db: ReturnType<typeof getDb>
let app: ApplicationContract
let BaseModel: ReturnType<typeof getBaseModel>
const FactoryModel = getFactoryModel()
const factoryManager = new FactoryManager()

test.group('Factory | Factory Builder | make', (group) => {
  group.setup(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.teardown(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('apply factory model state', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    )
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const user = await factory.apply('withPoints').makeStubbed()
    assert.equal(user.points, 10)
    assert.exists(user.id)
    assert.isFalse(user.$isPersisted)
  })

  test('applying a state twice must be a noop', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    )
      .state('withPoints', (user) => {
        user.points += 10
      })
      .build()

    const user = await factory.apply('withPoints').apply('withPoints').makeStubbed()

    assert.equal(user.points, 10)
    assert.exists(user.id)
    assert.isFalse(user.$isPersisted)
  })

  test('pass instance of builder to the state callback', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    )
      .state('withPoints', (user, __, builder) => {
        assert.instanceOf(builder, FactoryBuilder)
        user.merge({ points: 10 })
      })
      .build()

    const user = await factory.apply('withPoints').makeStubbed()
    assert.equal(user.points, 10)
    assert.exists(user.id)
    assert.isFalse(user.$isPersisted)
  })

  test('merge custom attributes', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    ).build()

    const user = await factory.merge({ username: 'nikk' }).makeStubbed()
    assert.equal(user.username, 'nikk')
    assert.exists(user.id)
    assert.isFalse(user.$isPersisted)
  })

  test('define custom merge function', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    )
      .merge(() => {})
      .build()

    const user = await factory.merge({ username: 'nikk' }).makeStubbed()
    assert.equal(user.username, 'virk')
    assert.exists(user.id)
    assert.isFalse(user.$isPersisted)
  })

  test('pass builder to custom merge function', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    )
      .merge((_, __, ___, builder) => {
        assert.instanceOf(builder, FactoryBuilder)
      })
      .build()

    const user = await factory.merge({ username: 'nikk' }).makeStubbed()
    assert.equal(user.username, 'virk')
    assert.exists(user.id)
    assert.isFalse(user.$isPersisted)
  })

  test('define custom newUp function', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    )
      .newUp((attributes) => {
        const user = new User()
        user.fill(attributes)
        user.$extras = { invoked: true }
        return user
      })
      .merge(() => {})
      .build()

    const user = await factory.makeStubbed()
    assert.equal(user.username, 'virk')
    assert.exists(user.id)
    assert.deepEqual(user.$extras, { invoked: true })
    assert.isFalse(user.$isPersisted)
  })

  test('pass model to custom newUp function', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    )
      .newUp((attributes) => {
        const user = new User()
        user.fill(attributes)
        user.$extras = { invoked: true }
        return user
      })
      .merge(() => {})
      .build()

    const user = await factory.makeStubbed()
    assert.equal(user.username, 'virk')
    assert.exists(user.id)
    assert.deepEqual(user.$extras, { invoked: true })
    assert.isFalse(user.$isPersisted)
  })

  test('pass factory builder to custom newUp function', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    )
      .newUp((attributes, _, __, builder) => {
        assert.instanceOf(builder, FactoryBuilder)

        const user = new User()
        user.fill(attributes)
        user.$extras = { invoked: true }
        return user
      })
      .merge(() => {})
      .build()

    const user = await factory.makeStubbed()
    assert.equal(user.username, 'virk')
    assert.exists(user.id)
    assert.deepEqual(user.$extras, { invoked: true })
    assert.isFalse(user.$isPersisted)
  })

  test('use 0 index elements when attributes are defined as an array', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    ).build()

    const user = await factory.merge([{ username: 'nikk' }, { username: 'romain' }]).makeStubbed()
    assert.equal(user.username, 'nikk')
    assert.exists(user.id)
    assert.isFalse(user.$isPersisted)
  })

  test('invoke after make hook', async ({ assert }) => {
    assert.plan(6)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    )
      .after('make', (_, user, ctx) => {
        assert.instanceOf(_, FactoryBuilder)
        assert.instanceOf(user, User)
        assert.instanceOf(ctx, FactoryContext)
      })
      .build()

    const user = await factory.makeStubbed()
    assert.equal(user.username, 'virk')
    assert.exists(user.id)
    assert.isFalse(user.$isPersisted)
  })

  test('invoke after makeStubbed hook', async ({ assert }) => {
    assert.plan(6)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    )
      .after('makeStubbed', (_, user, ctx) => {
        assert.instanceOf(_, FactoryBuilder)
        assert.instanceOf(user, User)
        assert.instanceOf(ctx, FactoryContext)
      })
      .build()

    const user = await factory.makeStubbed()
    assert.equal(user.username, 'virk')
    assert.exists(user.id)
    assert.isFalse(user.$isPersisted)
  })

  test('define custom id inside make hook', async ({ assert }) => {
    assert.plan(3)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    )
      .after('make', (_, user, ctx) => {
        if (ctx.isStubbed) {
          user.id = 100
        }
      })
      .build()

    const user = await factory.makeStubbed()
    assert.equal(user.username, 'virk')
    assert.equal(user.id, 100)
    assert.isFalse(user.$isPersisted)
  })

  test('tap into model persistence before makeStubbed', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    ).build()

    const user = await factory
      .tap(($user, ctx) => {
        if (ctx.isStubbed) {
          $user.id = 100
        }
      })
      .makeStubbed()

    assert.equal(user.username, 'virk')
    assert.equal(user.id, 100)
    assert.isFalse(user.$isPersisted)
  })

  test('tap into model persistence before make', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    ).build()

    const user = await factory
      .tap(($user) => {
        $user.username = 'tapped'
      })
      .make()

    assert.equal(user.username, 'tapped')
    assert.isFalse(user.$isPersisted)
  })

  test('bubble erros when makeStubbed fails', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    )
      .state('foo', () => {
        throw new Error('boom')
      })
      .build()

    await assert.rejects(async () => await factory.apply('foo').makeStubbed(), 'boom')
  })

  test('bubble erros when make fails', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    )
      .state('foo', () => {
        throw new Error('boom')
      })
      .build()

    await assert.rejects(async () => await factory.apply('foo').make(), 'boom')
  })
})

test.group('Factory | Factory Builder | makeMany', (group) => {
  group.setup(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.teardown(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('apply factory model state', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    )
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const users = await factory.apply('withPoints').makeStubbedMany(2)
    assert.lengthOf(users, 2)
    assert.exists(users[0].id)
    assert.equal(users[0].points, 10)
    assert.isFalse(users[0].$isPersisted)

    assert.exists(users[1].id)
    assert.equal(users[1].points, 10)
    assert.isFalse(users[1].$isPersisted)
  })

  test('applying a state twice must be a noop', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    )
      .state('withPoints', (user) => (user.points += 10))
      .build()

    const users = await factory.apply('withPoints').apply('withPoints').makeStubbedMany(2)
    assert.lengthOf(users, 2)

    assert.exists(users[0].id)
    assert.equal(users[0].points, 10)
    assert.isFalse(users[0].$isPersisted)

    assert.exists(users[1].id)
    assert.equal(users[1].points, 10)
    assert.isFalse(users[1].$isPersisted)
  })

  test('define custom attributes accepted by the newUp method', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    ).build()

    const users = await factory.merge({ username: 'nikk' }).makeStubbedMany(2)
    assert.lengthOf(users, 2)

    assert.exists(users[0].id)
    assert.equal(users[0].username, 'nikk')
    assert.isFalse(users[0].$isPersisted)

    assert.exists(users[1].id)
    assert.equal(users[1].username, 'nikk')
    assert.isFalse(users[1].$isPersisted)
  })

  test('define index specific attributes for makeMany', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    ).build()

    const users = await factory
      .merge([{ username: 'nikk' }, { username: 'romain' }])
      .makeStubbedMany(2)
    assert.lengthOf(users, 2)

    assert.exists(users[0].id)
    assert.equal(users[0].username, 'nikk')
    assert.isFalse(users[0].$isPersisted)

    assert.exists(users[1].id)
    assert.equal(users[1].username, 'romain')
    assert.isFalse(users[1].$isPersisted)
  })

  test('run makeStubbed hook for all the model instances', async ({ assert }) => {
    assert.plan(15)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    )
      .after('makeStubbed', (_, user, ctx) => {
        assert.instanceOf(_, FactoryBuilder)
        assert.instanceOf(user, User)
        assert.instanceOf(ctx, FactoryContext)
        assert.equal(user.points, 10)
      })
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const users = await factory.apply('withPoints').makeStubbedMany(2)
    assert.lengthOf(users, 2)
    assert.exists(users[0].id)
    assert.equal(users[0].points, 10)
    assert.isFalse(users[0].$isPersisted)

    assert.exists(users[1].id)
    assert.equal(users[1].points, 10)
    assert.isFalse(users[1].$isPersisted)
  })

  test('run make hook for all the model instances', async ({ assert }) => {
    assert.plan(15)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    )
      .after('make', (_, user, ctx) => {
        assert.instanceOf(_, FactoryBuilder)
        assert.instanceOf(user, User)
        assert.instanceOf(ctx, FactoryContext)
        assert.equal(user.points, 10)
      })
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const users = await factory.apply('withPoints').makeStubbedMany(2)
    assert.lengthOf(users, 2)
    assert.exists(users[0].id)
    assert.equal(users[0].points, 10)
    assert.isFalse(users[0].$isPersisted)

    assert.exists(users[1].id)
    assert.equal(users[1].points, 10)
    assert.isFalse(users[1].$isPersisted)
  })

  test('tap into model persistence before makeStubbedMany', async ({ assert }) => {
    assert.plan(15)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    )
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const users = await factory
      .apply('withPoints')
      .tap((user, ctx, builder) => {
        assert.instanceOf(builder, FactoryBuilder)
        assert.instanceOf(user, User)
        assert.instanceOf(ctx, FactoryContext)
        assert.equal(user.points, 10)
      })
      .makeStubbedMany(2)

    assert.lengthOf(users, 2)
    assert.exists(users[0].id)
    assert.equal(users[0].points, 10)
    assert.isFalse(users[0].$isPersisted)

    assert.exists(users[1].id)
    assert.equal(users[1].points, 10)
    assert.isFalse(users[1].$isPersisted)
  })

  test('tap into model persistence before makeMany', async ({ assert }) => {
    assert.plan(13)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    )
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const users = await factory
      .apply('withPoints')
      .tap((user, ctx, builder) => {
        assert.instanceOf(builder, FactoryBuilder)
        assert.instanceOf(user, User)
        assert.instanceOf(ctx, FactoryContext)
        assert.equal(user.points, 10)
      })
      .makeMany(2)

    assert.lengthOf(users, 2)
    assert.equal(users[0].points, 10)
    assert.isFalse(users[0].$isPersisted)

    assert.equal(users[1].points, 10)
    assert.isFalse(users[1].$isPersisted)
  })

  test('bubble errors when makeStubbedMany fails', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    )
      .merge(() => {
        throw new Error('boom')
      })
      .build()

    await assert.rejects(
      async () => await factory.merge({ username: 'virk' }).makeStubbedMany(2),
      'boom'
    )
  })

  test('bubble errors when makeMany fails', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    )
      .merge(() => {
        throw new Error('boom')
      })
      .build()

    await assert.rejects(async () => await factory.merge({ username: 'virk' }).makeMany(2), 'boom')
  })
})

test.group('Factory | Factory Builder | create', (group) => {
  group.setup(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.teardown(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('apply factory model state', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    )
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const user = await factory.apply('withPoints').create()
    assert.equal(user.points, 10)
    assert.isTrue(user.$isPersisted)
  })

  test('applying a state twice must be a noop', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    )
      .state('withPoints', (user) => (user.points += 10))
      .build()

    const user = await factory.apply('withPoints').apply('withPoints').create()
    assert.equal(user.points, 10)
    assert.isTrue(user.$isPersisted)
  })

  test('define custom attributes accepted by the newUp method', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    ).build()

    const user = await factory.merge({ username: 'nikk' }).create()
    assert.equal(user.username, 'nikk')
    assert.isTrue(user.$isPersisted)
  })

  test('use index 0 elements when attributes are defined as an array', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    ).build()

    const user = await factory.merge([{ username: 'nikk' }, { username: 'romain' }]).create()
    assert.equal(user.username, 'nikk')
    assert.isTrue(user.$isPersisted)
  })

  test('invoke before and after create hook', async ({ assert }) => {
    assert.plan(4)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    )
      .before('create', (_, user) => {
        assert.isFalse(user.$isPersisted)
      })
      .after('create', (_, user) => {
        assert.isTrue(user.$isPersisted)
      })
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const user = await factory.apply('withPoints').create()
    assert.equal(user.points, 10)
    assert.isTrue(user.$isPersisted)
  })

  test('invoke after make hook', async ({ assert }) => {
    assert.plan(6)
    const stack: string[] = []

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    )
      .before('create', (_, user) => {
        stack.push('beforeCreate')
        assert.isFalse(user.$isPersisted)
      })
      .after('make', (_, user) => {
        stack.push('afterMake')
        assert.isFalse(user.$isPersisted)
      })
      .after('create', (_, user) => {
        stack.push('afterCreate')
        assert.isTrue(user.$isPersisted)
      })
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const user = await factory.apply('withPoints').create()
    assert.equal(user.points, 10)
    assert.isTrue(user.$isPersisted)
    assert.deepEqual(stack, ['afterMake', 'beforeCreate', 'afterCreate'])
  })

  test('define custom connection', async ({ assert }) => {
    assert.plan(3)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    )
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const user = await factory
      .connection('secondary')
      .apply('withPoints')
      .tap((_, { $trx }) => {
        assert.equal($trx?.connectionName, 'secondary')
      })
      .create()

    assert.equal(user.points, 10)
    assert.isTrue(user.$isPersisted)
  })

  test('define custom query client', async ({ assert }) => {
    assert.plan(3)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    )
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const client = db.connection('secondary')

    const user = await factory
      .client(client)
      .apply('withPoints')
      .tap((_, { $trx }) => {
        assert.equal($trx?.connectionName, 'secondary')
      })
      .create()

    assert.equal(user.points, 10)
    assert.isTrue(user.$isPersisted)
  })

  test('invoke tap callback before persisting the model', async ({ assert }) => {
    assert.plan(6)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    )
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const client = db.connection('secondary')

    const user = await factory
      .client(client)
      .apply('withPoints')
      .tap(($user, ctx, builder) => {
        assert.instanceOf(builder, FactoryBuilder)
        assert.instanceOf($user, User)
        assert.instanceOf(ctx, FactoryContext)
        assert.equal($user.points, 10)
      })
      .create()

    assert.equal(user.points, 10)
    assert.isTrue(user.$isPersisted)
  })

  test('bubble errors when create fails', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    )
      .state('withPoints', () => {
        throw new Error('boo')
      })
      .build()

    const client = db.connection('secondary')
    await assert.rejects(async () => await factory.client(client).apply('withPoints').create())
  })
})

test.group('Factory | Factory Builder | createMany', (group) => {
  group.setup(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.teardown(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('apply factory model state', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    )
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const users = await factory.apply('withPoints').createMany(2)
    assert.lengthOf(users, 2)
    assert.equal(users[0].points, 10)
    assert.isTrue(users[0].$isPersisted)
    assert.equal(users[1].points, 10)
    assert.isTrue(users[1].$isPersisted)
  })

  test('applying a state twice must be a noop', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    )
      .state('withPoints', (user) => (user.points += 10))
      .build()

    const users = await factory.apply('withPoints').apply('withPoints').createMany(2)
    assert.lengthOf(users, 2)
    assert.equal(users[0].points, 10)
    assert.isTrue(users[0].$isPersisted)
    assert.equal(users[1].points, 10)
    assert.isTrue(users[1].$isPersisted)
  })

  test('define custom attributes accepted by the newUp method', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: randomUUID(),
          points: 0,
        }
      },
      factoryManager
    ).build()

    const users = await factory.merge({ points: 10 }).createMany(2)
    assert.lengthOf(users, 2)
    assert.equal(users[0].points, 10)
    assert.isTrue(users[0].$isPersisted)
    assert.equal(users[1].points, 10)
    assert.isTrue(users[1].$isPersisted)
  })

  test('define index specific attributes for makeMany', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    ).build()

    const users = await factory.merge([{ username: 'nikk' }, { username: 'romain' }]).createMany(2)
    assert.lengthOf(users, 2)
    assert.equal(users[0].username, 'nikk')
    assert.isTrue(users[0].$isPersisted)
    assert.equal(users[1].username, 'romain')
    assert.isTrue(users[1].$isPersisted)
  })

  test('invoke tap before persisting all models', async ({ assert }) => {
    assert.plan(11)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    ).build()

    const users = await factory
      .merge([{ username: 'nikk' }, { username: 'romain' }])
      .tap(($user, ctx, builder) => {
        assert.instanceOf(builder, FactoryBuilder)
        assert.instanceOf($user, User)
        assert.instanceOf(ctx, FactoryContext)
      })
      .createMany(2)

    assert.lengthOf(users, 2)
    assert.equal(users[0].username, 'nikk')
    assert.isTrue(users[0].$isPersisted)
    assert.equal(users[1].username, 'romain')
    assert.isTrue(users[1].$isPersisted)
  })

  test('bubble errors when createMany fails', async ({ assert }) => {
    let index = 0

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    )
      .merge(() => {
        index++
        if (index === 2) {
          throw new Error('boom')
        }
      })
      .build()

    await assert.rejects(
      async () => await factory.merge([{ username: 'nikk' }, { username: 'romain' }]).createMany(2),
      'boom'
    )

    const users = await User.all()
    assert.lengthOf(users, 0)
  })
})
