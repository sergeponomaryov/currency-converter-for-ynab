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
                <select class="custom-select" id="currency" v-model="userCurrency" @change="convert('budget'); saveCurrency()">
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
                    <span class="input-group-text"><span :class="userFlag"></span>{{ userCurrency }}</span>
                  </div>
                  <input type="number" min="0.00" class="form-control" v-model="amountUserCurrency" @change="convert('budget');">
                  <div class="input-group-prepend">
                    <span class="input-group-text"><span :class="budgetFlag"></span>{{ budgetCurrency }}</span>
                  </div>
                  <input type="number" min="0.00" class="form-control" v-model="amountBudgetCurrency" @change="convert('user');">
                </div>
              </div>
            </div>
              
            <div class="form-group row">
              <label for="budget" class="col-sm-2 col-form-label">Budget</label>
              <div class="col-sm-10">
                <select class="custom-select" id="budget" v-model="budgetId" @change="getCategories(); getPayees(); getAccounts(); saveBudget()" >
                  <option v-for="budget in budgets" v-bind:value="budget.id">
                    {{ budget.name }}
                  </option>
                </select>
              </div>
            </div>
              
            <div class="form-group row">
              <label for="payee" class="col-sm-2 col-form-label">Payee</label>
              <div class="col-sm-10">
                <select class="custom-select" id="payee" v-model="payee">
                  <option v-for="payee in payees" v-bind:value="payee.id">
                    {{ payee.name }}
                  </option>
                </select>
              </div>
            </div>
              
            <div class="form-group row">
              <label for="category" class="col-sm-2 col-form-label">Category</label>
              <div class="col-sm-10">
                <select class="custom-select" id="category" v-model="category">
                  <optgroup v-for="group in categories" :label="group.name">
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
                <select class="custom-select" id="account" v-model="account" @change="saveAccount()">
                  <option v-for="account in accounts" v-bind:value="account.id">
                    {{ account.name }}
                  </option>
                </select>
              </div>
            </div>
              
            <div class="form-group row">
              <label for="category" class="col-sm-2 col-form-label">Date</label>
              <div class="col-sm-10">
                <input type="date" class="custom-select" id="date" v-model="date">
              </div>
            </div>
              
            <button type="submit" class="btn btn-primary" v-on:click="submitTransaction()" @submit.prevent>Submit</button>
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
      // data loaded from YNAB or elsewhere
      budgets: [],
      payees: [],
      accounts: [],
      categories: [],
      currencies: currencies,
      // data in add transaction form
      budgetId: null,
      category: null,
      payee: null,
      account: localStorage.getItem('account'),
      amountUserCurrency: 0,
      amountBudgetCurrency: 0,
      userCurrency: localStorage.getItem('currency'),
      budgetCurrency: null,
      date: new Date().toISOString().slice(0,10)
      // @todo / functionality
      // set default user currency to budget currency
      // add plus/minus
      // 0 and 0.00
      // searchable select
      // submit ofc. Prevent default.
      // remove code from url
      // 6 requests go out when changing budget..
      // make sure disk cache on this (rates) doesn't last more than a day
      // python cronjob, make sure permissions are ok, set up error logging to file, make sure THAT json is used
      // more fields memo etc
      // log out (in footer?)
      
      // @maintenance / making it nice
      // loaders umm?
      // theme/design fixes
      // remove weird ass currencies
      // remove obsolete packages from npm/calls to them (selects etc)
      // look into reliance on glitch cdn/css files
      // remove all console logs
      // set to production mode
      // console errors on first login
      // move template to a separate file
    }
  },
  // When this component is created, check whether we need to get a token,
  // budgets or display the transactions
  created: async function() {
    console.log(sessionStorage);
    this.ynab.token = await this.findYNABToken();
    if (this.ynab.token) {
      this.api = new ynab.api(this.ynab.token);
      this.budgetId = localStorage.getItem('budget') || this.setDefaultBudget();
      //this.getRates(); called from convert
    }
    fx.base = "USD";
  },
  watch: {
    'budgetId': async function (val) {
      if(!this.budgets.length) {
        this.budgets = await this.getBudgets();
        if(this.budgets.length) this.cache("budgets", this.budgets);
      }
      this.setBudgetCurrency(this.budgets);
      
      this.getCategories();
      this.getPayees();
      this.getAccounts();
    },
    'budgetCurrency': function (val) {
      this.convert('budget');
    },
  },
  computed: {
    'budgetFlag': function() {
      let val = (this.budgetCurrency) ? "flag-"+this.budgetCurrency.slice(0, 2).toLowerCase() : null;
      return val;
    },
    'userFlag': function() {
      let val = (this.userCurrency) ? "flag-"+this.userCurrency.slice(0, 2).toLowerCase() : null;
      return val;
    }
  },
  methods: {
    submitTransaction: function() {
      let data = {account_id: this.account, date: this.date, payee_id: this.payee, amount: this.amount, category_id: this.category, approved: true};
      console.log(data);
      // api.transactions.createTransaction(this.budgetId, data).then((res) => {
      //   resolve(res.data.budgets);
      // }).catch((err) => {
      //   reject(err);
      // });
      // console.log(this.amount);
      // this.amount = '';
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
        let amount = (target == "budget") ? this.amountUserCurrency : this.amountBudgetCurrency;
        let from = (target == "budget") ? this.userCurrency : this.budgetCurrency;
        let to = (target == "budget") ? this.budgetCurrency : this.userCurrency;
        
        let converted = fx.convert(amount, {from: from, to: to}).toFixed(2);
        
        if(target == "budget") this.amountBudgetCurrency = converted;
        else if(target == "user") this.amountUserCurrency = converted;
      })
    },
    saveCurrency() {
      localStorage.setItem('currency', this.userCurrency);
    },
    saveBudget() {
      localStorage.setItem('budget', this.budgetId);
    },
    saveAccount() {
      localStorage.setItem('account', this.account);
    },
    // This uses the YNAB API to get a list of budgets
    getBudgets() {
      let api = this.api;
      let cache = this.getCached("budgets");
      return new Promise(function (resolve, reject) {
        if(cache) resolve(cache);
        else api.budgets.getBudgets().then((res) => {
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
        this.budgetId = res.data.budget.id;
      }).catch((err) => {
        this.error = err.error.detail;
      }).finally(() => {
        this.loading = false;
      });
    },
    setBudgetCurrency: function(budgets) {
      let currentBudgetId = this.budgetId;
      let currentBudget = [];
      budgets.forEach(function(budget) {
        if(budget.id == currentBudgetId) currentBudget = budget;
      });
      this.budgetCurrency = currentBudget.currency_format.iso_code;
    },
    getCategories() {
      let cache = this.getCached("categories-"+this.budgetId);
      if(cache) {this.categories = cache; return true;}
      this.loading = true;
      this.error = null;
      this.api.categories.getCategories(this.budgetId).then((res) => {
        this.categories = res.data.category_groups;
        // clear them out from trash
        this.categories.forEach(function(group) {
          if(group.name == "Internal Master Category") group.name = "Inflows";
          group.categories = group.categories.filter(category => category.hidden == false && category.name != "Deferred Income SubCategory" && category.name != "Uncategorized");
        });
        this.categories = this.categories.filter(group => group.name != "Hidden Categories" && group.name != "Credit Card Payments" && group.hidden == false);
        this.cache("categories-"+this.budgetId, this.categories);
      }).catch((err) => {
        this.error = err.error.detail;
      }).finally(() => {
        this.loading = false;
      });
    },
    getPayees() {
      let cache = this.getCached("payees-"+this.budgetId);
      if(cache) {this.payees = cache; return true;}
      this.loading = true;
      this.error = null;
      this.api.payees.getPayees(this.budgetId).then((res) => {
        this.payees = res.data.payees.filter(payee => payee.name != "Reconciliation Balance Adjustment" && payee.name != "Starting Balance" && payee.name != "Manual Balance Adjustment");
        this.cache("payees-"+this.budgetId, this.payees);
      }).catch((err) => {
        this.error = err.error.detail;
      }).finally(() => {
        this.loading = false;
      });
    },
    getAccounts() {
      let cache = this.getCached("accounts-"+this.budgetId);
      if(cache) {this.accounts = cache; return true;}
      this.loading = true;
      this.error = null;
      this.api.accounts.getAccounts(this.budgetId).then((res) => {
        this.accounts = res.data.accounts;
        this.cache("accounts-"+this.budgetId, this.accounts);
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
      const uri = `https://app.youneedabudget.com/oauth/authorize?client_id=${this.ynab.clientId}&redirect_uri=${this.ynab.redirectUri}&response_type=code`;
      location.replace(uri);
    },
    // Method to find a YNAB token
    // First it looks in the location.hash and then localStorage
    findYNABToken: async function() {
      let token = null;
      let uri = window.location.search.substring(1); 
      let params = new URLSearchParams(uri);
      let code = params.get("code");
      if (code && code !== '') {
        let accessData = await this.getAccessToken(code);
        token = this.setAccessData(accessData);
        // remove code from url
      } else {
        // Otherwise try localStorage
        // check if we have anything stored at all...
        let expires_at = localStorage.getItem('ynab_expires_at');
        if(!expires_at) return null;
        if(new Date().getTime() >= expires_at) { // need to refresh it..
          let accessData = await this.refreshAccessToken(localStorage.getItem('ynab_refresh_token'));
          token = this.setAccessData(accessData);
        } else { // good to go
          token = localStorage.getItem('ynab_access_token');
        }
      }
      return token;
    },
    getAccessToken(code) {
      return new Promise(function (resolve, reject) {
        axios.post(config.apiUrl + "token", {"code": code})
        .then(response => {
          resolve(response.data);
        }).catch(err => {
          reject(err);
        })
      });
    },
    refreshAccessToken(refreshToken) {
      return new Promise(function (resolve, reject) {
        axios.post(config.apiUrl + "refresh", {"refresh_token": refreshToken})
        .then(response => {
          resolve(response.data);
        }).catch(err => {
          reject(err);
        })
      });
    },
    setAccessData(accessData) {
      localStorage.setItem('ynab_access_token', accessData.access_token);
      localStorage.setItem('ynab_refresh_token', accessData.refresh_token);
      localStorage.setItem('ynab_expires_at', (accessData.expires_in * 1000) + new Date().getTime());
      return accessData.access_token;
    },
    // Clear the token and start authorization over
    resetToken() {
      localStorage.removeItem('ynab_access_token');
      this.ynab.token = null;
      this.error = null;
    },
    cache(name, data) {
      let expires = new Date().getTime() + (5 * 60 * 1000);
      let sessionObject = {
        expiresAt: expires,
        data: data
      }
      sessionStorage.setItem(name, JSON.stringify(sessionObject));
    },
    getCached(name) {
      let sessionObject = JSON.parse(sessionStorage.getItem(name));
      if(!sessionObject) return null;
      let expires = sessionObject.expiresAt;
      if(new Date().getTime() >= expires) return null;
      else return sessionObject.data;
    },
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
