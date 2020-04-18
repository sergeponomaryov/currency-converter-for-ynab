<template>
  <div id="app">
    <Nav />
    <div class="container">

      <!-- Display a loading message if loading 
      <h1 v-if="loading" class="display-4">Loading...</h1>-->

      <!-- Display an error if we got one -->
      <div v-if="error">
        <h1 class="display-4">Oops!</h1>
        <p class="lead">{{error}}</p>
        <button class="btn btn-primary" @click="resetToken">Try Again &gt;</button>
      </div>

      <!-- Otherwise show our app contents -->
      <div v-else>

        <!-- If we dont have a token ask the user to authorize with YNAB -->
        <form v-if="!ynab.token">
          <div class="form-group">
            <h2>Currency Converter for YNAB</h2>
            <p class="lead">No more messing up the numbers in your budget and waiting for a conversion to happen.</p>
            <p class="lead">Simple way to add transactions to YNAB with a built in, on the fly currency converter.</p>
            <button @click="authorizeWithYNAB" class="btn btn-primary">Connect With YNAB &gt;</button>
          </div>
        </form>

        <div v-else>
          <div class="container">
            <h5>Add Transaction</h5>
            <form id="form">
              
            <div class="form-group row">
              <label for="currency" class="col-sm-2 col-form-label">Currency</label>
              <div class="col-sm-10">
                <!-- build a searchable select here, and preferably country flags. should also save last input. try vue-multiselect this time... -->
                <select class="custom-select" id="currency" v-model="addTransaction.currency" @change="convert(); saveCurrency()">
                  <option v-for="currency in currencies" v-bind:value="currency.id">
                    {{ currency.currencyName }}
                  </option>
                </select>
              </div>
            </div>
              
            <!-- Put flags here instead -->
            <div class="form-group row">
              <label for="amount" class="col-sm-2 col-form-label">Amount</label>
              <div class="col-sm-10">
                <div class="input-group">
                  <div class="input-group-prepend">
                    <span class="input-group-text">{{ addTransaction.currency }}</span>
                  </div>
                  <input type="number" min="0.00" class="form-control" v-model="addTransaction.amountUserCurrency" @change="convert()">
                  <div class="input-group-prepend">
                    <span class="input-group-text">≈ {{ budgetCurrency }}</span>
                  </div>
                  <input type="number" min="0.00" class="form-control" v-model="addTransaction.amountBudgetCurrency" >
                </div>
              </div>
            </div>
              
            <div class="form-group row">
              <label for="budget" class="col-sm-2 col-form-label">Budget</label>
              <div class="col-sm-10">
                <select class="custom-select" id="budget" v-model="addTransaction.budget" @change="getCategories(); getPayees(); getAccounts(); saveBudget()" >
                  <option v-for="budget in budgets" v-bind:value="budget.id">
                    {{ budget.name }}
                  </option>
                </select>
              </div>
            </div>
              
            <div class="form-group row">
              <label for="payee" class="col-sm-2 col-form-label">Payee</label>
              <div class="col-sm-10">
                <select class="custom-select" id="payee" v-model="addTransaction.payee">
                  <option v-for="payee in payees" v-bind:value="payee.id">
                    {{ payee.name }}
                  </option>
                </select>
              </div>
            </div>
              
            <div class="form-group row">
              <label for="category" class="col-sm-2 col-form-label">Category</label>
              <div class="col-sm-10">
                <select class="custom-select" id="category" v-model="addTransaction.category">
                  <optgroup v-for="group in categoryGroups" :label="group.name">
                    <option v-for="category in group.categories" v-bind:value="category.id">
                      {{ category.name }}
                    </option>
                  </optgroup>
                </select>
              </div>
            </div>
              
            <div class="form-group row">
              <label for="account" class="col-sm-2 col-form-label">Account</label>
              <div class="col-sm-10">
                <select class="custom-select" id="account" v-model="addTransaction.account" @change="saveAccount()">
                  <option v-for="account in accounts" v-bind:value="account.id">
                    {{ account.name }}
                  </option>
                </select>
              </div>
            </div>
              
            <div class="form-group row">
              <label for="category" class="col-sm-2 col-form-label">Date</label>
              <div class="col-sm-10">
                <input type="date" class="form-control" id="date" v-model="addTransaction.date">
              </div>
            </div>
              
              
            <button type="submit" class="btn btn-primary" v-on:click="submitTransaction">Submit</button>
          </form>
          </div>
        </div>

      </div>
      <footer class="pt-4 my-md-5 pt-md-5 border-top">
        <div class="row">
          <div class="col-12 col-md">
            <p><small class="text-muted">
              <a href="#">Privacy Policy</a>
            </small></p>
            <p><small class="text-muted">
              <a target="_blank" href="https://icons8.com/icons/set/currency-exchange">Currency Exchange</a> icon by <a target="_blank" href="https://icons8.com">Icons8</a>
            </small></p>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>
<style src="vue-multiselect/dist/vue-multiselect.min.css"></style>

<script>
// Hooray! Here comes YNAB!
import * as ynab from 'ynab';

// Import our config for YNAB
import config from './config.json';
import currencies from './currencies2.json';

// Import Our Components to Compose Our App
import Nav from './components/Nav.vue';
import Footer from './components/Footer.vue';
import Budgets from './components/Budgets.vue';
import Transactions from './components/Transactions.vue';
import NewTransaction from './components/NewTransaction.vue';
  
import Vue from 'vue';
  
import Multiselect from 'vue-multiselect'
var fx = require("money");
const axios = require('axios');

// register globally
Vue.component('multiselect', Multiselect)

export default {
  // The data to feed our templates
  data () {
    return {
      ynab: {
        clientId: config.clientId,
        redirectUri: config.redirectUri,
        token: null,
        api: null,
      },
      loading: false,
      error: null,
      budgetId: null,
      budgets: [],
      transactions: [],
      payees: [],
      accounts: [],
      categoryGroups: [],
      addTransaction: {
        currency: sessionStorage.getItem('currency'),
        budget: sessionStorage.getItem('budget'),
        account: sessionStorage.getItem('account'),
        amountUserCurrency: 0,
        amountBudgetCurrency: 0,
        date: new Date().toISOString().slice(0,10)
      },
      currencies: currencies,
      budgetCurrency: "USD"
    }
  },
  // When this component is created, check whether we need to get a token,
  // budgets or display the transactions
  created() {
    this.ynab.token = this.findYNABToken();
    if (this.ynab.token) {
      this.api = new ynab.api(this.ynab.token);
      this.getBudgets();
      this.getCategories();
      this.getPayees();
      this.getAccounts();
    }
    fx.base = this.budgetCurrency;
    fx.rates = {
      [fx.base] : 1, // always include the base rate (1:1)
    };
  },
  methods: {
    submitTransaction: function() {
      console.log(this.addTransaction.amount);
      this.amount = '';
    },
    getRate(curr) {
      let budgetCurrency = this.budgetCurrency;
      return new Promise(function (resolve, reject) {
        if(fx.rates.hasOwnProperty(curr)) resolve();
        axios.get('https://free.currconv.com/api/v7/convert?apiKey='+config.currencyApiKey+'&q='+budgetCurrency+'_'+curr+'&compact=ultra')
        .then(response => {
          fx.rates[curr] = response.data[Object.keys(response.data)[0]];
          resolve();
        }).catch(err => {
          reject(err);
          //this.error = err.error.detail;
        })
      });
    },
    convert() {
      this.getRate(this.addTransaction.currency)
      .then(response => {
        console.log(fx.rates);
        let converted = fx.convert(this.addTransaction.amountUserCurrency, {from: this.addTransaction.currency, to: this.budgetCurrency});
        this.addTransaction.amountBudgetCurrency = converted.toFixed(2);
      })
    },
    saveCurrency() {
      sessionStorage.setItem('currency', this.addTransaction.currency);
    },
    saveBudget() {
      sessionStorage.setItem('budget', this.addTransaction.budget);
    },
    saveAccount() {
      sessionStorage.setItem('account', this.addTransaction.account);
    },
    // This uses the YNAB API to get a list of budgets
    getBudgets() {
      this.loading = true;
      this.error = null;
      this.api.budgets.getBudgets().then((res) => {
        this.budgets = res.data.budgets;
      }).catch((err) => {
        this.error = err.error.detail;
      }).finally(() => {
        this.loading = false;
      });
    },
    getCategories() {
      this.loading = true;
      this.error = null;
      this.api.categories.getCategories(this.addTransaction.budget).then((res) => {
        this.categoryGroups = res.data.category_groups;
        // clear them out from trash
        this.categoryGroups.forEach(function(group) {
          if(group.name == "Internal Master Category") group.name = "Inflows";
          group.categories = group.categories.filter(category => category.hidden == false && category.name != "Deferred Income SubCategory" && category.name != "Uncategorized");
        });
        this.categoryGroups = this.categoryGroups.filter(group => group.name != "Hidden Categories" && group.name != "Credit Card Payments" && group.hidden == false);
      }).catch((err) => {
        this.error = err.error.detail;
      }).finally(() => {
        this.loading = false;
      });
    },
    getPayees() {
      this.loading = true;
      this.error = null;
      this.api.payees.getPayees(this.addTransaction.budget).then((res) => {
        this.payees = res.data.payees.filter(payee => payee.name != "Reconciliation Balance Adjustment" && payee.name != "Starting Balance" && payee.name != "Manual Balance Adjustment");
      }).catch((err) => {
        this.error = err.error.detail;
      }).finally(() => {
        this.loading = false;
      });
    },
    getAccounts() {
      this.loading = true;
      this.error = null;
      this.api.accounts.getAccounts(this.addTransaction.budget).then((res) => {
        this.accounts = res.data.accounts;
      }).catch((err) => {
        this.error = err.error.detail;
      }).finally(() => {
        this.loading = false;
      });
    },
    // This selects a budget and gets all the transactions in that budget
    selectBudget(id) {
      this.loading = true;
      this.error = null;
      this.budgetId = id;
      this.transactions = [];
      this.api.transactions.getTransactions(id).then((res) => {
        this.transactions = res.data.transactions;
      }).catch((err) => {
        this.error = err.error.detail;
      }).finally(() => {
        this.loading = false;
      });
    },
    // This builds a URI to get an access token from YNAB
    // https://api.youneedabudget.com/#outh-applications
    authorizeWithYNAB(e) {
      e.preventDefault();
      const uri = `https://app.youneedabudget.com/oauth/authorize?client_id=${this.ynab.clientId}&redirect_uri=${this.ynab.redirectUri}&response_type=token`;
      location.replace(uri);
    },
    // Method to find a YNAB token
    // First it looks in the location.hash and then sessionStorage
    findYNABToken() {
      let token = null;
      const search = window.location.hash.substring(1).replace(/&/g, '","').replace(/=/g,'":"');
      if (search && search !== '') {
        // Try to get access_token from the hash returned by OAuth
        const params = JSON.parse('{"' + search + '"}', function(key, value) {
          return key === '' ? value : decodeURIComponent(value);
        });
        token = params.access_token;
        sessionStorage.setItem('ynab_access_token', token);
        window.location.hash = '';
      } else {
        // Otherwise try sessionStorage
        token = sessionStorage.getItem('ynab_access_token');
      }
      return token;
    },
    // Clear the token and start authorization over
    resetToken() {
      sessionStorage.removeItem('ynab_access_token');
      this.ynab.token = null;
      this.error = null;
    }
  },
  // Specify which components we want to make available to our templates
  components: {
    Nav,
    Footer,
    Budgets,
    Transactions,
    NewTransaction
  }
}
</script>
