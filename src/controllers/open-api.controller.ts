import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {Response, RestBindings, api, operation, param, requestBody} from '@loopback/rest';
import {BalanceReserve} from '../models/balance-reserve.model';
import {Balance} from '../models/balance.model';
import {BalanceRepository, BalanceReserveRepository} from '../repositories';
import {v4 as uuidv4} from 'uuid';
import { OPS } from '../config';
import { use } from 'should';


/**
 * The controller class is generated from OpenAPI spec with operations tagged
 * by <no-tag>.
 *
 */
@api({
  components: {
    schemas: {
      Balance: {
        type: 'object',
        properties: {
          user_id: {
            type: 'number',
            format: 'int32',
          },
          account: {
            type: 'string',
          },
          balance: {
            type: 'number',
            format: 'float',
          },
        },
      },
      BalanceReserve: {
        type: 'object',
        properties: {
          id: {
            type: 'number',
            format: 'int32',
          },
          order_id: {
            type: 'string',
          },
          user_id: {
            type: 'number',
            format: 'int32',
          },
          operation: {
            type: 'string',
          },
          price: {
            type: 'number',
            format: 'float',
          },
          completed: {
            type: 'boolean',
          },
        },
      },
    },
  },
  paths: {},
})
export class OpenApiController {
  constructor(
    @repository(BalanceRepository) private balanceRepo: BalanceRepository,
    @repository(BalanceReserveRepository) private reserveRepo: BalanceReserveRepository,
    @inject(RestBindings.Http.RESPONSE) private response: Response,
  ) { }
  /**
   *
   *
   * @param _requestBody Created courier
   */
  @operation('post', '/balance/add', {
    operationId: 'addBalance',
    responses: {
      '200': {
        description: 'OK',
      },
    },
    requestBody: {
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/Balance',
          },
        },
      },
      description: 'Created courier',
      required: true,
    },
  })
  async addBalance(@requestBody({
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/Balance',
        },
      },
    },
    description: 'Created balance',
    required: true,
  }) _requestBody: Balance): Promise<Balance|BalanceReserve> {
    const id = _requestBody.user_id;
    let sum = 0
    try {
      sum = (await this.balanceRepo.findById(id)).balance;
    } catch {
      const result = await this.balanceRepo.create(_requestBody)
      return result
    }
    
    let add= new BalanceReserve();
    //add.order_id=uuidv4();
    add.operation=OPS.ADD;
    add.price=_requestBody.balance;
    add.user_id=_requestBody.user_id;
    let result = await this.reserveRepo.create(add);

    let balance = sum + _requestBody.balance;
    await this.balanceRepo.updateById(id, {balance: balance})
    // let result = new Balance();
    // result.account = _requestBody.account;
    // result.balance = balance;
    // result.user_id = _requestBody.user_id;
    return result
  }

  /**
     *
     *
     * @param _requestBody Created courier
     */
  @operation('get', '/balance/{userID}', {
    operationId: 'getBalance',
    responses: {
      '200': {
        description: 'OK',
      },
    },
    parameters: [
      {
        name: 'userID',
        in: 'path',
        description: 'ID of order',
        required: true,
        schema: {
          type: 'number',
        },
      },
    ],
  })
  async getBalance(@param({
    name: 'userID',
    in: 'path',
    description: 'ID of order',
    required: true,
    schema: {
      type: 'number',
    },
  }) userID: number): Promise<unknown> {
    let result = await this.balanceRepo.findById(userID);
    let calcBalance=await this.calcBalance(userID);
    if (calcBalance!=result.balance) this.balanceRepo.updateById(userID,{balance: calcBalance});
    result.balance=calcBalance;
    return result
  }

  /**
   *
   *
   * @param _requestBody Created reserve balance
   */
  @operation('post', '/balance/reserve', {
    operationId: 'reserveBalance',
    responses: {
      '200': {
        description: 'OK',
      },
    },
    requestBody: {
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/BalanceReserve',
          },
        },
      },
      description: 'Created reserve balance',
      required: true,
    },
  })
  async reserveBalance(@requestBody({
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/BalanceReserve',
        },
      },
    },
    description: 'Created reserve balance',
    required: true,
  }) _requestBody: BalanceReserve): Promise<unknown> {
    console.log("RESERVE", _requestBody);
    const orderID = _requestBody.order_id;
    if (_requestBody.completed) {      
      let filter={
        where: {
          order_id: orderID,
        }
      };
      let order=await this.reserveRepo.findOne(filter);
      await this.reserveRepo.updateById(order?.id, {completed: true});
      return
    } else {
      if (!_requestBody.user_id) return this.response.status(404).send({
        error: "Error! The user ID is empty!"
      });

      const userID = _requestBody.user_id;
      let balance = (await this.balanceRepo.findById(userID)).balance;
      let calcBalance=await this.calcBalance(userID);
      if (calcBalance!=balance) this.balanceRepo.updateById(userID,{balance: calcBalance});
      balance=calcBalance;
      const rest = balance - (_requestBody.price ?? 0)
      if (rest < 0) {
        return this.response.status(400).send({
          error: "Недостаточно средст на счете!"
        })
      }
      await this.balanceRepo.updateById(userID, {balance: rest})
      _requestBody.price=-(_requestBody.price??0);
      _requestBody.operation='buy';
      const result = await this.reserveRepo.create(_requestBody)
      return result
    }
  }
  /**
   *
   *
   * @param _requestBody Created reserve balance
   */
  @operation('delete', '/balance/reserve', {
    operationId: 'deleteReserve',
    responses: {
      '200': {
        description: 'OK',
      },
    },
    requestBody: {
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/BalanceReserve',
          },
        },
      },
      description: 'Created reserve balance',
      required: true,
    },
  })
  async deleteReserve(@requestBody({
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/BalanceReserve',
        },
      },
    },
    description: 'Created reserve balance',
    required: true,
  }) _requestBody: BalanceReserve): Promise<unknown> {
    console.log('DELETE', _requestBody);
    let orderID = _requestBody.order_id;
    let filter={
      where: {
        order_id: orderID,
      }
    };
    let orders=await this.reserveRepo.find(filter);
    let order=new BalanceReserve();
    let cancelledOrder=0;
    let createdOrder=0;
    for (let o of orders) {
      if (o.operation==OPS.BUY) {
        createdOrder++;
        order=o;
      }
      if (o.operation==OPS.CANCEL) {
        cancelledOrder++;
      }
    }
    if (cancelledOrder) {
      return this.response.status(400).send({
        error: "Error! The order was cancelled!"
      });
    }
    if (!createdOrder) {
      return this.response.status(400).send({
        error: "Error! No such order!"
      });
    }
    //let reserved = await this.reserveRepo.findById(order?.id);
    let userID = order?.user_id;
    if (!userID) return this.response.status(400).send({
      error: "Error! The user ID does not found!"
    });
    let balance = (await this.balanceRepo.findById(userID)).balance;
    let cancel=new BalanceReserve();
    cancel.order_id=order?.order_id;
    cancel.operation=OPS.CANCEL;
    cancel.price=-(order.price??0);
    cancel.user_id=userID;
    await this.reserveRepo.create(cancel);
    await this.balanceRepo.updateById(userID, {balance: balance + (cancel.price ?? 0)});
    //await this.reserveRepo.deleteById(orderID);
    return cancel
  }

  /**
    *
    *
    * @param _requestBody Created reserve balance
    */
  @operation('get', '/balance/{userID}/reserve/{orderID}', {
    operationId: 'getReserve',
    responses: {
      '200': {
        description: 'OK',
      },
    },
    parameters: [
      {
        name: 'orderID',
        in: 'path',
        description: 'ID of order',
        required: true,
        schema: {
          type: 'string',
        },
      },
      {
        name: 'userID',
        in: 'path',
        description: 'ID of user',
        required: true,
        schema: {
          type: 'number',
        },
      },
    ],
    
  })
  async getReserve(
  @param({
    name: 'userID',
    in: 'path',
    description: 'ID of user',
    required: true,
    schema: {
      type: 'number',
    },
  }) userID: number,
  @param({
    name: 'orderID',
    in: 'path',
    description: 'ID of order',
    required: true,
    schema: {
      type: 'string',
    },
  }) orderID?: string,
  ): Promise<BalanceReserve[]> {
    let filter={
      where: {
        order_id: orderID,
        user_id: userID,
      }
    };
    let orders=await this.reserveRepo.find(filter);
    //let reserved = await this.reserveRepo.findById(_requestBody.order_id);
    return orders;
  }

  /**
    *
    *
    * @param _requestBody Created reserve balance
    */
  @operation('get', '/balance/{userID}/reserve', {
    operationId: 'getReserve',
    responses: {
      '200': {
        description: 'OK',
      },
    },
    parameters: [
      {
        name: 'userID',
        in: 'path',
        description: 'ID of user',
        required: true,
        schema: {
          type: 'number',
        },
      },
    ],
    
  })
  async getReserves(
  @param({
    name: 'userID',
    in: 'path',
    description: 'ID of user',
    required: true,
    schema: {
      type: 'number',
    },
  }) userID: number,

  ): Promise<BalanceReserve[]> {
    let filter={
      where: {
        user_id: userID,
      }
    };
    let orders=await this.reserveRepo.find(filter);
    //let reserved = await this.reserveRepo.findById(_requestBody.order_id);
    return orders;
  }


  private async calcBalance(user_id: number):Promise<number> {
    const filter ={
      where: {
        user_id: user_id,
      }
    }
    let operations=await this.reserveRepo.find(filter);
    let result=0;
    for (let op of operations) {
      result+=op.price??0;
    }
    return result
  }
}

