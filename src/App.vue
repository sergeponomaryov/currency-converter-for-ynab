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
          <h1 class="display-4">Congrats!</h1>
          <p class="lead">You have successfully started a new YNAB API Application!</p>
          <ul>
            <li>Please go to your <a href="https://app.youneedabudget.com/settings/developer" target="_blank" rel="noopener noreferrer">YNAB Developer Settings</a> and create a new OAuth Application.</li>
            <li>Copy your client ID and redirect URI into <em>src/config.json</em>.</li>
            <li>Then build your amazing app!</li>
          </ul>
          <p>If you have any questions please reach out to us at <strong>api@youneedabudget.com</strong>.</p>
          <p>&nbsp;</p>

          <div class="form-group">
            <h2>Hello!</h2>
            <p class="lead">If you would like to use this App, please authorize with YNAB!</p>
            <button @click="authorizeWithYNAB" class="btn btn-primary">Authorize This App With YNAB &gt;</button>
          </div>
          
          <footer class="pt-4 my-md-5 pt-md-5 border-top">
            <div>
              <h2>Privacy Policy</h2>
              <p>This website does not store any information from you or your YNAB account. All data retrieved from the YNAB API is stored only in your browser and is never transmitted to any other location or third-party.</p>
            </div>
            <div class="row">
              <div class="col-12 col-md">
                <small class="text-muted">MADE BY</small>
                <h5><a href="#">You!</a></h5>
              </div>
            </div>
          </footer>
        </form>

        <div v-else>
          <div class="container">
            <h5>Add Transaction</h5>
            <form id="form">
              
            <div class="form-group row">
              <label for="currency" class="col-sm-2 col-form-label">Currency</label>
              <div class="col-sm-10">
                <!-- build a searchable select here, and preferably country flags. should also save last input. try vue-multiselect this time... -->
                <select class="form-control" id="currency" v-model="addTransaction.currency">
                  <option v-for="(currency, code) in currencies" v-bind:value="code">
                    {{ currency }}
                  </option>
                </select>
              </div>
            </div>
              
            <div class="form-group row">
              <label for="amount" class="col-sm-2 col-form-label">Amount</label>
              <div class="col-sm-10">
                <input type="text" class="form-control" id="amount" v-model="addTransaction.amount">
              </div>
            </div>
              
            <div class="form-group row">
              <label for="budget" class="col-sm-2 col-form-label">Budget</label>
              <div class="col-sm-10">
                <select class="form-control" id="budget" v-model="addTransaction.budget" @change="getCategories()" >
                  <option v-for="budget in budgets" v-bind:value="budget.id">
                    {{ budget.name }}
                  </option>
                </select>
              </div>
            </div>
              
            <div class="form-group row">
              <label for="payee" class="col-sm-2 col-form-label">Payee</label>
              <div class="col-sm-10">
                <input type="text" class="form-control" id="payee" v-model="addTransaction.payee">
              </div>
            </div>
              
            <div class="form-group row">
              <label for="category" class="col-sm-2 col-form-label">Category</label>
              <div class="col-sm-10">
                <select class="form-control" id="category" v-model="addTransaction.category">
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
                <input type="text" class="form-control" id="account" v-model="addTransaction.account">
              </div>
            </div>
              
            <div class="form-group row">
              <label for="category" class="col-sm-2 col-form-label">Date</label>
              <div class="col-sm-10">
                <input type="text" class="form-control" id="date" v-model="addTransaction.date">
              </div>
            </div>
              
              
            <button type="submit" class="btn btn-primary" v-on:click="submitTransaction">Submit</button>
          </form>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

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
      categoryGroups: [],
      addTransaction: {amount: 1},
      currencies: currencies
    }
  },
  // When this component is created, check whether we need to get a token,
  // budgets or display the transactions
  created() {
    console.log("hi");
    this.ynab.token = this.findYNABToken();
    if (this.ynab.token) {
      this.api = new ynab.api(this.ynab.token);
      this.getBudgets();
    }
  },
  methods: {
    submitTransaction: function() {
      console.log(this.addTransaction.amount);
      this.amount = '';
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
