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
                <select class="custom-select" id="currency" v-model="addTransaction.currency" @change="convert('budget'); saveCurrency()">
                  <option v-for="(currency, code) in currencies" v-bind:value="code">
                    {{ currency }}
                  </option>
                </select>
              </div>
            </div>
              
            <div class="form-group row">
              <label for="amount" class="col-sm-2 col-form-label">Amount</label>
              <div class="col-sm-10">
                <div class="input-group">
                  <div class="input-group-prepend">
                    <span class="input-group-text"><span :class="userFlag"></span>{{ addTransaction.currency }}</span>
                  </div>
                  <input type="number" min="0.00" class="form-control" v-model="addTransaction.amountUserCurrency" @change="convert('budget');">
                  <div class="input-group-prepend">
                    <span class="input-group-text"><span :class="budgetFlag"></span>{{ budgetCurrency }}</span>
                  </div>
                  <input type="number" min="0.00" class="form-control" v-model="addTransaction.amountBudgetCurrency" @change="convert('user');">
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
                <input type="date" class="custom-select" id="date" v-model="addTransaction.date">
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
import currencies from './currencies.json';

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
      budget: null,
      transactions: [],
      payees: [],
      accounts: [],
      categoryGroups: [],
      addTransaction: {
        currency: sessionStorage.getItem('currency'),
        budget: null, // set in created() so that watch triggers
        account: sessionStorage.getItem('account'),
        amountUserCurrency: 0,
        amountBudgetCurrency: 0,
        date: new Date().toISOString().slice(0,10)
      },
      currencies: currencies,
      budgetCurrency: null
      // @todo
      // set default user currency to budget currency
      // add plus/minus
      // 0 and 0.00
      // searchable select
      // submit ofc
      // loaders
      // endless token
      // too many req's why? Maybe dont show this stuff and reload?
      // make sure disk cache on this doesn't last more than a day
      // rewrite this india
      // theme/design fixes
      // remove weird ass currencies
      // python cronjob, make sure permissions are ok, set up error logging to file
      // more fields memo etc
      // log out
      // remove obsolete packages from npm/calls to them (selects etc)
      // look into reliance on glitch cdn/css files
    }
  },
  // When this component is created, check whether we need to get a token,
  // budgets or display the transactions
  created: async function() {
    this.ynab.token = this.findYNABToken();
    if (this.ynab.token) {
      this.api = new ynab.api(this.ynab.token);
      this.addTransaction.budget = sessionStorage.getItem('budget') || this.setDefaultBudget();
      this.getRates();
    }
    fx.base = "USD";
  },
  watch: {
    'addTransaction.budget': function (val) {
      this.setCurrentBudget(); // loads all budgets, sets the currency
      this.getCategories();
      this.getPayees();
      this.getAccounts();
    },
    'budgetCurrency': function (val) {
      this.convert('budget');
    }
  },
  computed: {
    'budgetFlag': function() {
      let val = (this.budgetCurrency) ? "flag-"+this.budgetCurrency.slice(0, 2).toLowerCase() : null;
      return val;
    },
    'userFlag': function() {
      let val = (this.addTransaction.currency) ? "flag-"+this.addTransaction.currency.slice(0, 2).toLowerCase() : null;
      return val;
    }
  },
  methods: {
    submitTransaction: function() {
      console.log(this.addTransaction.amount);
      this.amount = '';
    },
    getRates() {
      // make sure disk cache on this doesn't last more than a day
      return new Promise(function (resolve, reject) {
        if(Object.keys(fx.rates).length) {
          resolve();
          return true;
        }
        axios.get(config.ratesUrl)
        .then(response => {
          fx.rates = response.data.rates;
          resolve();
        }).catch(err => {
          reject(err);
        })
      });
    },
    convert(target) {
      this.getRates()
      .then(response => {
        let amount = (target == "budget") ? this.addTransaction.amountUserCurrency : this.addTransaction.amountBudgetCurrency;
        let from = (target == "budget") ? this.addTransaction.currency : this.budgetCurrency;
        let to = (target == "budget") ? this.budgetCurrency : this.addTransaction.currency;
        
        let converted = fx.convert(amount, {from: from, to: to}).toFixed(2);
        
        if(target == "budget") this.addTransaction.amountBudgetCurrency = converted;
        else if(target == "user") this.addTransaction.amountUserCurrency = converted;
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
      let api = this.api;
      return new Promise(function (resolve, reject) {
        api.budgets.getBudgets().then((res) => {
          resolve(res.data.budgets);
        }).catch((err) => {
          reject(err);
        });
      });
    },
    setDefaultBudget() {
      this.loading = true;
      this.error = null;
      this.api.budgets.getBudgetById("default").then((res) => {
        this.addTransaction.budget = res.data.budget.id;
      }).catch((err) => {
        this.error = err.error.detail;
      }).finally(() => {
        this.loading = false;
      });
    },
    setCurrentBudget: async function() {
      // rewrite this india, resolve if we have it like the other functions
      // you forgot about how you wrote it yourself previously lol
      if(!this.budgets.length) {
        var budgets = await this.getBudgets();
        this.budgets = budgets;
      } else var budgets = this.budgets;
      let currentBudgetId = this.addTransaction.budget;
      let currentBudget = [];
      budgets.forEach(function(budget) {
        if(budget.id == currentBudgetId) currentBudget = budget;
      });
      this.budget = currentBudget;
      this.budgetCurrency = this.budget.currency_format.iso_code;
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
