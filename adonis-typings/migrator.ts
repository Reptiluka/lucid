/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

declare module '@ioc:Adonis/Lucid/Migrator' {
  import { SchemaConstructorContract } from '@ioc:Adonis/Lucid/Schema'

  /**
   * Migration node returned by the migration source
   * implementation
   */
  export type MigrationNode = {
    absPath: string,
    name: string,
    source: SchemaConstructorContract,
  }

  /**
   * Options accepted by migrator constructor
   */
  export type MigratorOptions = {
    direction: 'up',
    connectionName?: string,
    dryRun?: boolean,
  } | {
    direction: 'down',
    batch: number,
    connectionName?: string,
    dryRun?: boolean,
  }

  /**
   * Shape of the migrator
   */
  export interface MigratorContract {
    dryRun: boolean
    direction: 'up' | 'down'
    status: 'completed' | 'skipped' | 'pending'
    migratedFiles: string[]
    migratedQueries: { [file: string]: string[] }
    run (): Promise<void>
  }
}