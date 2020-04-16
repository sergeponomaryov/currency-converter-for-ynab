<template>
  <div class="container">
    <h5>Add Transaction</h5>
    <form id="form">
    <div class="form-group row">
      <label for="amount" class="col-sm-2 col-form-label">Amount</label>
      <div class="col-sm-10">
        <input type="text" class="form-control" id="amount" v-model="amount">
      </div>
    </div>
    <button type="submit" class="btn btn-primary">Submit</button>
  </form>
  </div>
</template>