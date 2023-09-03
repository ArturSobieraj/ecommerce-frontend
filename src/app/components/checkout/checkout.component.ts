import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {Luv2ShopFormService} from "../../services/luv2-shop-form.service";
import {Country} from "../../common/country";
import {State} from "../../common/state";
import {Luv2ShopValidators} from "../../validators/luv2-shop-validators";
import {CartService} from "../../services/cart.service";
import {CheckoutService} from "../../services/checkout.service";
import {Router} from "@angular/router";
import {OrderItem} from "../../common/order-item";
import {error} from "@angular/compiler-cli/src/transformers/util";
import {environment} from "../../../environments/environment";
import {PaymentInfo} from "../../common/payment-info";
import {bind} from "@okta/okta-auth-js";

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {

  // @ts-ignore
  checkoutFormGroup: FormGroup;
  totalPrice = 0;
  totalQuantity = 0;
  creditCardYears: number[] = [];
  creditCardMonths: number[] = [];
  countries: Country[] = [];
  shippingAddressStates: State[] = [];
  billingAddressStates: State[] = [];
  storage: Storage = sessionStorage;
  stripe = Stripe(environment.stripePublishableKey);
  paymentInfo = new PaymentInfo();
  cardElement: any;
  displayError: any = "";
  isDisabled = false;

  constructor(private formBuilder: FormBuilder,
              private luv2ShopFormService: Luv2ShopFormService,
              private cartService: CartService,
              private checkoutService: CheckoutService,
              private router: Router) {
  }

  ngOnInit() {
    this.setupStripePaymentForm();
    this.reviewCardDetails();
    const email = JSON.parse(this.storage.getItem('userEmail')!);
    this.checkoutFormGroup = this.formBuilder.group({
      customer: this.formBuilder.group({
        firstName: new FormControl('',
          [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhiteSpace]),
        lastName: new FormControl('',
          [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhiteSpace]),
        email: new FormControl(email,
          [Validators.required, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')])
      }),
      shippingAddress: this.formBuilder.group({
        street: new FormControl('',
          [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhiteSpace]),
        city: new FormControl('',
          [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhiteSpace]),
        state: new FormControl('', [Validators.required]),
        country: new FormControl('', [Validators.required]),
        zipCode: new FormControl('',
          [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhiteSpace])
      }),
      billingAddress: this.formBuilder.group({
        street: new FormControl('',
          [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhiteSpace]),
        city: new FormControl('',
          [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhiteSpace]),
        state: new FormControl('', [Validators.required]),
        country: new FormControl('', [Validators.required]),
        zipCode: new FormControl('',
          [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhiteSpace])
      }),
      creditCardInformation: this.formBuilder.group({

      })
    });
    this.luv2ShopFormService.getCountries().subscribe(
      data => {
        this.countries = data;
      }
    );
  }

  setupStripePaymentForm() {
    let elements = this.stripe.elements;
    this.cardElement = elements.create('card', { hidePostalCode: true });
    this.cardElement.mount('#card-element');
    this.cardElement.on('change', (event: any) => {
      this.displayError = document.getElementById('card-errors');
      if (event.complete) {
        this.displayError.textContent = "";
      } else if (event.error) {
        this.displayError.textContent = event.error.message;
      }
    });
  }

  get firstName() {
    return this.checkoutFormGroup.get('customer.firstName');
  }

  get lastName() {
    return this.checkoutFormGroup.get('customer.lastName');
  }

  get email() {
    return this.checkoutFormGroup.get('customer.email');
  }

  get shippingAddressStreet() {
    return this.checkoutFormGroup.get('shippingAddress.street');
  }

  get shippingAddressCity() {
    return this.checkoutFormGroup.get('shippingAddress.city');
  }

  get shippingAddressState() {
    return this.checkoutFormGroup.get('shippingAddress.state');
  }

  get shippingAddressCountry() {
    return this.checkoutFormGroup.get('shippingAddress.country');
  }

  get shippingAddressZipCode() {
    return this.checkoutFormGroup.get('shippingAddress.zipCode');
  }

  get billingAddressStreet() {
    return this.checkoutFormGroup.get('billingAddress.street');
  }

  get billingAddressCity() {
    return this.checkoutFormGroup.get('billingAddress.city');
  }

  get billingAddressState() {
    return this.checkoutFormGroup.get('billingAddress.state');
  }

  get billingAddressCountry() {
    return this.checkoutFormGroup.get('billingAddress.country');
  }

  get billingAddressZipCode() {
    return this.checkoutFormGroup.get('billingAddress.zipCode');
  }

  get creditCardType() {
    return this.checkoutFormGroup.get('creditCardInformation.cardType');
  }

  get creditCardNameOnCard() {
    return this.checkoutFormGroup.get('creditCardInformation.nameOnCard');
  }

  get creditCardNumber() {
    return this.checkoutFormGroup.get('creditCardInformation.cardNumber');
  }

  get creditCardSecurityCode() {
    return this.checkoutFormGroup.get('creditCardInformation.securityCode');
  }

  copyShippingAddressToBillingAddress(event: Event) {
    // @ts-ignore
    if (event.target!.checked) {
      this.checkoutFormGroup.controls['billingAddress']
        .setValue(this.checkoutFormGroup.controls['shippingAddress'].value)
      this.billingAddressStates = this.shippingAddressStates;
    } else {
      this.checkoutFormGroup.controls['billingAddress'].reset();
      this.billingAddressStates = [];
    }
  }

  handleMonthsAndYears() {
    const creditCardFormGroup = this.checkoutFormGroup.get('creditCardInformation');
    const currentYear = new Date().getFullYear();
    const selectedYear: number = Number.parseInt(creditCardFormGroup?.value.expirationYear);
    let startMonth: number;
    if (currentYear === selectedYear) {
      startMonth = new Date().getMonth() + 1;
    } else {
      startMonth = 1;
    }
    this.luv2ShopFormService.getCreditCardMonths(startMonth).subscribe(
      data => {
        this.creditCardMonths = data;
      }
    );
  }

  getStates(formGroupName: string) {
    const formGroup = this.checkoutFormGroup.get(formGroupName);
    const countryCode = formGroup!.value.country.code;
    const countryName = formGroup!.value.country.name;

    this.luv2ShopFormService.getStates(countryCode).subscribe(
      data => {
        if (formGroupName === 'shippingAddress') {
          this.shippingAddressStates = data;
        } else {
          this.billingAddressStates = data;
        }

        formGroup!.get('state')!.setValue(data[0]);
      }
    )
  }

  checkErrorsForCustomer(field: string, validator: string) {
    return this.checkoutFormGroup.get(`customer.${field}`)!.errors![validator];
  }

  checkErrorsForShippingAddress(field: string, validator: string) {
    return this.checkoutFormGroup.get(`shippingAddress.${field}`)!.errors![validator];
  }

  checkErrorsForBillingAddress(field: string, validator: string) {
    return this.checkoutFormGroup.get(`billingAddress.${field}`)!.errors![validator];
  }

  checkErrorsForCreditCard(field: string, validator: string) {
    return this.checkoutFormGroup.get(`creditCardInformation.${field}`)!.errors![validator];
  }

  reviewCardDetails() {
    this.cartService.totalQuantity.subscribe(
      data => this.totalQuantity = data
    );
    this.cartService.totalPrice.subscribe(
      data => this.totalPrice = data
    );
  }

  onSubmit() {
    if (this.checkoutFormGroup.invalid) {
      this.checkoutFormGroup.markAllAsTouched();
      return;
    }
    let order = {
      totalPrice: this.totalPrice,
      totalQuantity: this.totalQuantity
    }

    const cartItems = this.cartService.cartItems;
    let orderItems = cartItems.map(tempCartItem => new OrderItem(tempCartItem));
    let purchase = {
      customer: this.checkoutFormGroup.controls['customer'].value,
      shippingAddress: this.checkoutFormGroup.controls['shippingAddress'].value,
      billingAddress: this.checkoutFormGroup.controls['billingAddress'].value,
      order: order,
      orderItems: orderItems
    }
    purchase.shippingAddress.state = JSON.parse(JSON.stringify(purchase.shippingAddress.state.name));
    purchase.shippingAddress.country = JSON.parse(JSON.stringify(purchase.shippingAddress.country.name));
    purchase.billingAddress.state = JSON.parse(JSON.stringify(purchase.billingAddress.state.name));
    purchase.billingAddress.country = JSON.parse(JSON.stringify(purchase.billingAddress.country.name));

    this.paymentInfo.amount = Math.round(this.totalPrice * 100);
    this.paymentInfo.currency = "USD";
    this.paymentInfo.receiptEmail = purchase.customer.email;

    if (!this.checkoutFormGroup.invalid && this.displayError.textContent === "") {
      this.isDisabled = true;
      this.checkoutService.createPaymentIntent(this.paymentInfo).subscribe(
        paymentIntentResponse => {
          this.stripe.confirmCardPayment(paymentIntentResponse.client_secret,
            {
              payment_method: {
                card: this.cardElement,
                billing_details: {
                  email: purchase.customer.email,
                  name: `${purchase.customer.firstName} ${purchase.customer.lastName}`,
                  address: {
                    line1: purchase.billingAddress.street,
                    city: purchase.billingAddress.city,
                    state: purchase.billingAddress.state,
                    postal_code: purchase.billingAddress.zipCode,
                    country: this.billingAddressCountry?.value.code
                  }
                }
              }
            }, { handleActions: false })
            .then((result: any) => {
              if (result.error) {
                alert(`There was an error: ${result.error.message}`);
                this.isDisabled = false;
              } else {
                this.checkoutService.placeOrder(purchase).subscribe({
                  next: (response: any) => {
                    alert(`Your order has been recived.\nOrder tracking number: ${response.orderTrackingNumber}`);
                    this.resetCart();
                    this.isDisabled = false;
                  },
                  error: (error: any) => {
                    alert(`There was an error: ${error.message()}`);
                    this.isDisabled = false;
                  }
                });
              }
            });
        }
      );
    } else {
      this.checkoutFormGroup.markAllAsTouched();
      return;
    }
  }

  resetCart() {
    this.cartService.cartItems = [];
    this.cartService.totalPrice.next(0);
    this.cartService.totalQuantity.next(0);
    this.cartService.persistCartItems();
    this.checkoutFormGroup.reset();
    this.router.navigateByUrl("/products");
  }
}
