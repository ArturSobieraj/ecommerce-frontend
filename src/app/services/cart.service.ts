import { Injectable } from '@angular/core';
import {CartItem} from "../common/cart-item";
import {BehaviorSubject, Subject} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class CartService {

  cartItems: CartItem[] = [];
  totalPrice: Subject<number> = new BehaviorSubject<number>(0);
  totalQuantity: Subject<number> = new BehaviorSubject<number>(0);
  storage: Storage = sessionStorage;

  constructor() {
    let data = JSON.parse(this.storage.getItem('cartItems')!);

    if (data !== null) {
      this.cartItems = data;
      this.computeCartTotals();
    }
  }

  addToCart(cartItem: CartItem) {
    let alreadyExistInCart = false;
    let existingCartItem = null;

    if (this.cartItems.length > 0) {
      existingCartItem = this.cartItems.find(tempCartItem => tempCartItem.id === cartItem.id);
      alreadyExistInCart = !!existingCartItem;
    }
    if (alreadyExistInCart) {
      existingCartItem!.quantity++;
    } else {
      this.cartItems.push(cartItem);
    }
    this.computeCartTotals();

  }

  computeCartTotals() {
    let totalPriceValue= 0;
    let totalQuantityValue = 0;

    for (let currentCartItem of this.cartItems) {
      totalPriceValue += currentCartItem.quantity * currentCartItem.unitPrice;
      totalQuantityValue += currentCartItem.quantity;
    }
    this.totalPrice.next(totalPriceValue);
    this.totalQuantity.next(totalQuantityValue);
    this.persistCartItems();
  }

  decrementQuantity(tempCartItem: CartItem) {
    tempCartItem.quantity--;
    if (tempCartItem.quantity === 0) {
      this.remove(tempCartItem);
    } else {
      this.computeCartTotals();
    }
  }

  remove(tempCartItem: CartItem) {
    const itemIndex = this.cartItems.findIndex(cartItem => tempCartItem.id === cartItem.id);
    if (itemIndex > -1) {
      this.cartItems.splice(itemIndex, 1);
      this.computeCartTotals();
    }
  }

  persistCartItems() {
    this.storage.setItem('cartItems', JSON.stringify(this.cartItems));
  }
}
