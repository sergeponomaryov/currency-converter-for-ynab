<template>
  <div id="app">
    <Nav />
    <div class="container">

      <!-- Display an error if we got one -->
      <div v-if="error">
        <h1 class="display-4">Oops!</h1>
        <p class="lead">{{error}}</p>
        <button class="btn btn-primary" @click="resetToken">Try Again &gt;</button>
      </div>

      <!-- Otherwise show our app contents -->
      <div v-else>

        <!-- Display a spinner if loading -->
        <div class="spinner-border" role="status" v-if="loading">
          <span class="sr-only">Loading...</span>
        </div>
        
        <!-- If we dont have a token ask the user to authorize with YNAB -->
        <form v-else-if="!ynab.token">
          <div class="form-group" id="intro">
            <h5>How to use it:</h5>
            <p>Say you are from the US, traveling in Europe and paying with your dollar based card. You got a bill for €10 and want to record it to YNAB. Simply enter €10, this app will show you the amount in USD, then pick a category, etc. like you would in the regular app, submit, and that's it! You will know right away how many dollars you just spent, and your transaction is recorded to YNAB. Without googling "10 euros in dollars".</p>
            <p>Of course, no one can predict what rate your bank will charge you, but this is as close as it gets. Once a month, you can adjust your balances manually to account for rate movements.</p>
            <h5>Why it's different from others:</h5>
            <p>
              Other apps would require you to create a new account in YNAB for your euros and record €10 to it. But YNAB would show that as $10, until it would get converted to the actual dollar amount after some time. Meanwhile, your YNAB would show wrong numbers. Euros are not that different, but what if you used Japanese yen, at a rate of 100 yen to 1 dollar? And imagine adding new accounts for every single currency you want to use! That's confusing and inconvenient.
            </p>
            <button @click="authorizeWithYNAB" class="btn btn-success btn-lg">Connect With YNAB &gt;</button>
          </div>
        </form>

        <div v-else>
          <div> <!-- used to be container -->
            <h5 id="header">Add Transaction</h5>
            <form id="form" @submit.prevent>
              
            <div class="form-group row">
              <label for="currency" class="col-3 col-sm-2 col-form-label">Currency</label>
              <div class="col-9 col-sm-10">
                <model-list-select :list="currencies" v-model="userCurrency" option-value="code" :custom-text="currencySelectLabel" placeholder="Start typing..." class="custom-select"></model-list-select>
              </div>
            </div>
              
            <div class="form-group row">
              <label for="amount" class="col-3 col-sm-2 col-form-label">Amount</label>
              <div class="col-9 col-sm-10">
                <div class="input-group" v-if="userCurrency" id="user-currency-group">
                  <div class="input-group-prepend">
                    <span class="input-group-text currency-prepend"><span :class="userFlag"></span>{{ userCurrency }}</span>
                  </div>
                  <input type="number" min="0.00" step="0.01" class="form-control" v-model="amountUserCurrency" @input="convert('budget');" v-on:keydown.enter.prevent="convert('budget');" >
                </div>
                <div class="input-group">
                  <div class="input-group-prepend">
                    <span class="input-group-text currency-prepend"><span :class="budgetFlag"></span>{{ budgetCurrency }}</span>
                  </div>
                  <input type="number" min="0.01" step="0.01" class="form-control" v-model="amountBudgetCurrency" @input="convert('user');" v-on:keydown.enter.prevent="convert('budget');">
                </div>
              </div>
            </div>
              
            <div class="form-group row">
              <label for="budget" class="col-3 col-sm-2 col-form-label">Type</label>
              <div class="col-9 col-sm-10">
                <model-list-select :list="types" v-model="type" option-value="id" option-text="name" class="custom-select"></model-list-select>
              </div>
            </div>
              
            <div class="form-group row">
              <label for="budget" class="col-3 col-sm-2 col-form-label">Budget</label>
              <div class="col-9 col-sm-10">
                <model-list-select :list="budgets" v-model="budgetId" option-value="id" option-text="name" class="custom-select"></model-list-select>
              </div>
            </div>
              
            <div class="form-group row">
              <label for="payee" class="col-3 col-sm-2 col-form-label">Payee</label>
              <div class="col-9 col-sm-10">
                <model-list-select :list="payees" v-model="payee" option-value="id" option-text="name" class="custom-select"></model-list-select>
              </div>
            </div>
              
            <div class="form-group row">
              <label for="category" class="col-3 col-sm-2 col-form-label">Category</label>
              <div class="col-9 col-sm-10">
                <model-list-select :list="categories" v-model="category" option-value="id" option-text="name" class="custom-select"></model-list-select>
              </div>
            </div>
              
            <div class="form-group row">
              <label for="account" class="col-3 col-sm-2 col-form-label">Account</label>
              <div class="col-9 col-sm-10">
                <model-list-select :list="accounts" v-model="account" option-value="id" option-text="name" class="custom-select"></model-list-select>
              </div>
            </div>
              
            <div class="form-group row">
              <label for="category" class="col-3 col-sm-2 col-form-label">Date</label>
              <div class="col-9 col-sm-10">
                <input type="date" class="form-control" id="date" v-model="date" v-on:keydown.enter.prevent>
              </div>
            </div>
              
            <div class="form-group row">
              <label for="memo" class="col-3 col-sm-2 col-form-label">Memo</label>
              <div class="col-9 col-sm-10">
                <input type="text" class="form-control" id="memo" v-model="memo" placeholder="optional" v-on:keydown.enter.prevent>
              </div>
            </div>
              
            <div class="form-group row">
              <div class="col-form-label col-3 col-sm-2 custom-control custom-switch" id="cleared-switch">
                <input type="checkbox" class="custom-control-input" id="cleared" v-model="cleared" true-value="cleared" false-value="uncleared">
                <label class="custom-control-label" for="cleared">Cleared</label>
              </div>
              <div class="col-9 col-sm-10">
              </div>
            </div>
              
            <div id="submit-area">
              <button type="submit" class="btn btn-primary" v-on:click="submitTransaction()" v-if="!loadingSubmit">Submit</button>
              <div class="spinner-border" role="status" v-else>
                <span class="sr-only">Loading...</span>
              </div>
              <span class="text-success" v-if="addedSuccessfully">&nbsp;added successfully!</span>
              <span class="text-danger" v-if="formError">&nbsp;{{ formError }}</span>
            </div>
          </form>
          </div>
        </div>

      </div>
      <footer class="pt-4 my-md-5 pt-md-5 border-top" id="footer">
        <div class="row">
          <div class="col-12 col-md">
            <p v-if="ynab.token"><small class="text-muted">
              <a href="#" @click="resetToken">Log out</a>
            </small></p>
            <p><small class="text-muted">
              <a href="#privacy-policy" v-on:click="showPrivacy = !showPrivacy">Privacy Policy</a>
            </small></p>
            <p id="privacy-policy" v-if="showPrivacy">
              We don't store any data from your YNAB account. It is stored in your browser. Our API only obtains and refreshes access tokens for YNAB API, which is necessary to avoid being logged out every 2 hours. We do not store the tokens that we process. Data is not shared with third parties.
            </p>
            <p><small class="text-muted">
              <a target="_blank" href="https://icons8.com/icons/set/currency-exchange">Currency Exchange</a> icon by <a target="_blank" href="https://icons8.com">Icons8</a>
            </small></p>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>
<style src="vue-search-select/dist/VueSearchSelect.css"></style>

<script>
// Hooray! Here comes YNAB!
import * as ynab from 'ynab';

// Import our config for YNAB
import config from './config.json';
import currencies from './currenciesObj.json';

// Import Our Components to Compose Our App
import Nav from './components/Nav.vue';
import Footer from './components/Footer.vue';
  
import Vue from 'vue';
  
var fx = require("money");
const axios = require('axios');
  
import { ModelListSelect } from 'vue-search-select'
  
  
export default {
  // The data to feed our templates
  data () {
    return {
      ynab: {
        clientId: config.clientId,
        redirectUri: (window.location.href.search("glitch.me") == -1) ? config.redirectUrl : "https://currency-converter-for-ynab.glitch.me/",
        token: null,
        api: null,
      },
      loading: false,
      loadingSubmit: false,
      error: null,
      addedSuccessfully: false,
      formError: false,
      showPrivacy: false,
      // data loaded from YNAB or elsewhere
      budgets: [],
      payees: [],
      accounts: [],
      categories: [],
      currencies: currencies,
      types: [{id: -1, name: 'Expense'}, {id: 1, name: 'Income'}],
      // data in add transaction form
      type: -1,
      budgetId: null,
      category: null,
      payee: null,
      memo: null,
      cleared: localStorage.getItem('cleared'),
      account: localStorage.getItem('account'),
      amountUserCurrency: 0,
      amountBudgetCurrency: 0,
      userCurrency: localStorage.getItem('currency'),
      budgetCurrency: null,
      date: new Date().toISOString().slice(0,10)
      
      // @todo
      // code reset doesnt work in ff.. also input highlighted in red
      // usd gets 0'd when user currency is first selected
      // contact email. Zoho for now i think will work best.
      // seo: optimise your meta description to have a clickable useful SERP snippet. Other meta stuff. Thats it.
      
      // @maintenance
      // cors whitelist on both json and api
      // check if rates do get reloaded without cache after 24h (check by content in network)
      // test analytics after deploy
      // Cannot read property 'iso_code' of undefined when empty budget
      // probably for later, if requested: type-in payees. Not even sure how to do that with this shitty ass select. Either option that will turn it into a text input, or fork the select to do it like in web ynab.
      
      // @launch
      // use it yourself for a while to add txs and ask lina too, for feedback. Do it, many quirks and lots of india tbh. Make sure it works. Wait a bit. Dont screw up.
      // get approved by ynab
      // Google Search Console
      // ask them to add it to list
      // post on ynab forum
      // post on reddit
      // Also add your app to all posts and stuff that list ways to currency convert.
    }
  },
  // When this component is created, check whether we need to get a token,
  // budgets or display the transactions
  created: async function() {
    this.ynab.token = await this.findYNABToken();
    if (this.ynab.token) {
      this.api = new ynab.api(this.ynab.token);
      this.budgetId = localStorage.getItem('budget') || this.setDefaultBudget();
    }
    fx.base = "USD";
    this.amountUserCurrency = this.amountUserCurrency.toFixed(2);
    this.amountBudgetCurrency = this.amountBudgetCurrency.toFixed(2);
    console.log(this.ynab.redirectUri);
  },
  watch: {
    'budgetId': async function (val) {
      if(!this.budgets.length) {
        this.loading = true;
        this.budgets = await this.getBudgets();
        if(this.budgets.length) {
          this.cache("budgets", this.budgets);
          this.loading = false;
        }
        var budgets = this.budgets;
      } else var budgets = this.budgets;
      this.setBudgetCurrency(budgets);
      
      this.getCategories();
      this.getPayees();
      this.getAccounts();
      this.saveBudget();
    },
    'account': function(val) {
      this.saveAccount();
    },
    'cleared': function(val) {
      this.saveCleared();
    },
    'budgetCurrency': function (val) {
      this.convert('budget');
    },
    'userCurrency': function (val) {
      this.convert('budget');
      this.saveCurrency();
    }
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
      this.formError = null;
      this.addedSuccessfully = false;
      if(this.amountBudgetCurrency < 0.01) this.formError = "please enter an amount";
      else if(!this.account) this.formError = "please select an account";
      else {
        let data = {"transaction": {account_id: this.account, date: this.date, payee_id: this.payee, amount: this.amountBudgetCurrency * this.type * 1000, category_id: this.category, approved: true, memo: this.memo, cleared: this.cleared}};
        this.loadingSubmit = true;
        this.api.transactions.createTransaction(this.budgetId, data).then((res) => {
          this.loadingSubmit = false;
          this.amountUserCurrency = 0;
          this.amountUserCurrency = this.amountBudgetCurrency = this.amountUserCurrency.toFixed(2);
          this.memo = this.payee = this.category = null;
          this.addedSuccessfully = true;
        }).catch((err) => {
          this.formError = err.error.detail;
          this.loadingSubmit = false;
        });
      }
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
      if(!this.userCurrency) return true;
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
    saveCleared() {
      localStorage.setItem('cleared', this.cleared);
    },
    saveBudget() {
      localStorage.setItem('budget', this.budgetId);
    },
    saveAccount() {
      localStorage.setItem('account', this.account);
    },
    currencySelectLabel(item) {
        return `${item.label} (${item.code})`
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
      this.error = null;
      this.api.budgets.getBudgetById("default").then((res) => {
        this.budgetId = res.data.budget.id;
      }).catch((err) => {
        this.error = err.error.detail;
      })
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
      this.error = null;
      this.api.categories.getCategories(this.budgetId).then((res) => {
        let categories = [];
        let groups = res.data.category_groups;
        // clear them out from trash
        groups.forEach(function(group) {
          if(group.name == "Internal Master Category") group.name = "Inflows";
          group.categories = group.categories.filter(category => category.hidden == false && category.name != "Deferred Income SubCategory" && category.name != "Uncategorized");
        });
        groups = groups.filter(group => group.name != "Hidden Categories" && group.name != "Credit Card Payments" && group.hidden == false);
        groups.forEach(function(group) {
          group.categories.forEach(function(category) {
            categories.push({id: category.id, name: group.name + ": " + category.name});
          });
        });
        this.categories = categories;
        this.cache("categories-"+this.budgetId, this.categories);
        //console.log(JSON.stringify(this.categories));
      }).catch((err) => {
        this.error = err.error.detail;
      })
    },
    getPayees() {
      let cache = this.getCached("payees-"+this.budgetId);
      if(cache) {this.payees = cache; return true;}
      this.error = null;
      this.api.payees.getPayees(this.budgetId).then((res) => {
        this.payees = res.data.payees.filter(payee => payee.name != "Reconciliation Balance Adjustment" && payee.name != "Starting Balance" && payee.name != "Manual Balance Adjustment");
        //this.payees.unshift({id: null, name: ""});
        this.cache("payees-"+this.budgetId, this.payees);
      }).catch((err) => {
        this.error = err.error.detail;
      })
    },
    getAccounts() {
      let cache = this.getCached("accounts-"+this.budgetId);
      if(cache) {this.accounts = cache; return true;}
      this.error = null;
      this.api.accounts.getAccounts(this.budgetId).then((res) => {
        this.accounts = res.data.accounts;
        this.cache("accounts-"+this.budgetId, this.accounts);
      }).catch((err) => {
        this.error = err.error.detail;
      })
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
        this.loading = true;
        try {
          let accessData = await this.getAccessToken(code, this.ynab.redirectUri);
          token = this.setAccessData(accessData);
        } catch(err) {
          this.error = err;
        }
        // remove code from url
        window.history.replaceState({}, document.title, "/");
      } else {
        // Otherwise try localStorage
        // check if we have anything stored at all...
        let expires_at = localStorage.getItem('ynab_expires_at');
        if(!expires_at) return null;
        if(new Date().getTime() >= expires_at) { // need to refresh it..
          this.loading = true;
          try {
            let accessData = await this.refreshAccessToken(localStorage.getItem('ynab_refresh_token'));
            token = this.setAccessData(accessData);
          } catch(err) {
            this.error = err;
          }
        } else { // good to go
          token = localStorage.getItem('ynab_access_token');
        }
      }
      this.loading = false;
      return token;
    },
    getAccessToken(code, redirectUrl) {
      return new Promise(function (resolve, reject) {
        axios.post(config.apiUrl + "token", {"code": code, "redirect_url": redirectUrl})
        .then(response => {
          resolve(response.data);
        }).catch(err => {
          reject(err.response.data.message);
        })
      });
    },
    refreshAccessToken(refreshToken) {
      return new Promise(function (resolve, reject) {
        axios.post(config.apiUrl + "refresh", {"refresh_token": refreshToken})
        .then(response => {
          resolve(response.data);
        }).catch(err => {
          reject(err.response.data.message);
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
      localStorage.removeItem('ynab_refresh_token');
      localStorage.removeItem('ynab_expires_at');
      sessionStorage.clear();
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
    ModelListSelect
  }
}
</script>
