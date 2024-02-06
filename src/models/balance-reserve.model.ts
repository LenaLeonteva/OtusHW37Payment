import {Entity, model, property} from '@loopback/repository';

/**
 * The model class is generated from OpenAPI schema - BalanceReserve
 * BalanceReserve
 */
@model({name: 'BalanceReserve'})
export class BalanceReserve extends Entity {
  constructor(data?: Partial<BalanceReserve>) {
    super(data);
    if (data != null && typeof data === 'object') {
      Object.assign(this, data);
    }
  }

  /**
   *
   */
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  /**
   *
   */
  @property({
    type: 'string',
  })
  order_id?: string;

  /**
   *
   */
  @property({
    type: 'number',
    format: 'int32',
    minimum: 0,
    maximum: 2147483647,
  })
  user_id?: number;

  @property({
    type: 'string',
  })
  operation?: string;
  /**
   *
   */
  @property({
    type: 'number',
    format: 'float',
    maximum: 3.402823669209385e+38,
  })
  price?: number;

  /**
   *
   */
  @property({
    type: 'boolean',
  })
  completed?: boolean;

}

export interface BalanceReserveRelations {
  // describe navigational properties here
}

export type BalanceReserveWithRelations = BalanceReserve & BalanceReserveRelations;


