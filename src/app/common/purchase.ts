import {Customer} from "./customer";
import {Address} from "./address";
import {Order} from "./order";
import {OrderItem} from "./order-item";

export interface Purchase {
  customer: Customer;
  shippingAddress: Address;
  billingAddress: Address;
  order: Order;
  orderItems: OrderItem[];
}
