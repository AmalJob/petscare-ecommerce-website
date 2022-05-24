var express = require('express');
const req = require('express/lib/request');
const res = require('express/lib/response');
const async = require('hbs/lib/async');
const { response } = require('../app');
const productHelpers = require('../helpers/product-helpers');
var router = express.Router();
var productHelper=require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');


/* GET users listing. */
const cridential={
  email:process.env.ADMIN,
  password:process.env.PASSWORD
}
const verifyLogin=(req,res,next)=>{
 if(req.session.adminLoggedIn){
   next()
 }else{
res.redirect('/admin/admin-login')
 }
}

 router.get('/admin-login',(req,res)=>{
 if(req.session.adminLoggedIn){
   res.redirect('/admin/')
 }else{
   res.render('admin/admin-login',{admin:true,'loginErr':req.session.adminLoginErr})
   req.session.adminLoginErr=false
 }
 })


router.post('/admin-login', function(req, res) {

  if(req.body.Email==cridential.email && req.body.Password==cridential.password){
    user= req.session.adminLoggedIn=true;
    res.redirect('/admin/')
    
  }else{

    req.session.adminLoginErr="Invalid username or password"
    res.redirect('/admin/admin-login')
  }
});

router.get('/',verifyLogin,async(req,res,next)=>{
  let totalIncome = await productHelpers.getTotalIncome();
  console.log("total",totalIncome);
  let totalUsers = await productHelpers.getTotalUsers();
  let totalProducts = await productHelpers.getTotalProducts();
  let totalOrders = await productHelpers.getTotalOrders();
  let currentDaySale= await productHelpers.getCurrentDaySale();
  
 
    res.render('admin/dashboard',{home:true,
      totalIncome,
      totalUsers,
      totalProducts,
      totalOrders,
      currentDaySale
                     })
  
})
router.get("/report",verifyLogin, (req, res) => {
  productHelpers.monthlyReport().then((data) => {
    res.render("admin/report", {
      admin: true,user,
      data
      
    });
  });
});

router.post("/report", (req, res) => {
  productHelpers.salesReport(req.body).then((data) => {
    res.render("admin/report", {
      admin: true,
      data,
     
    });
  });
});



router.get('/getChartDates', async(req,res)=>{
  let dailySales= await productHelpers.getdailyIncome()
 
  let yearlySales= await productHelpers.getYearlySale()
  let month= await productHelpers.countsalemonth()

  res.json({dailySales,yearlySales,month})
})


router.get('/view-products',verifyLogin,(req,res,next)=>{
  productHelpers.getAllProducts().then((products)=>{
    res.render('admin/view-products',{admin:true,products,user})
  })
})


 router.get('/add-product',verifyLogin, function (req,res) {
   res.render('admin/add-product',{admin:true,user});
 })
 router.post('/add-product',(req,res)=>{
   
  productHelpers.addProduct(req.body,(id)=>{
    let image=req.files?.Image
    let image2=req.files?.Image2
    let image3=req.files?.Image3
    image.mv('./public/product-images/'+id+'.jpg',(err,done)=>{
      if(!err){

        res.render('admin/add-product',{admin:true,user})
      }else{
       
      }
    })
    image2.mv('./public/product-images2/'+id+'.jpg',(err,done)=>{
    })
      image3.mv('./public/product-images3/'+id+'.jpg',(err,done)=>{
  })
  })
 })
 router.get('/delete-product/:id',verifyLogin,(req,res)=>{
   const proId=req.params.id
  
   productHelpers.deleteProduct(proId).then((Response)=>{
     res.redirect('/admin/view-products')
   })
 })
 router.get('/edit-product/:id',verifyLogin, async (req,res)=>{
   let product= await productHelpers.getProductDetails(req.params.id)
  
   res.render('admin/edit-product',{product,admin:true,user});
 })
 router.post('/edit-product/:id',verifyLogin,(req,res)=>{
   let id=req.params.id
  
   productHelpers.updateProduct(req.params.id,req.body).then(()=>{
     res.redirect('/admin/view-products')
     if(req.files?.Image && req.files?.Image2 && req.files?.Image3 ){
      let image=req.files.Image
      image.mv('./public/product-images/'+id+'.jpg')
      let image2=req.files.Image2
      image2.mv('./public/product-images2/'+id+'.jpg')
      let image3=req.files.Image3
      image3.mv('./public/product-images3/'+id+'.jpg')
     }

      else if(req.files?.Image &&req.files?.Image2  ){
        let image=req.files.Image
        image.mv('./public/product-images/'+id+'.jpg')
      let image2=req.files.Image2
      image2.mv('./public/product-images2/'+id+'.jpg')
     }
 
    else if( req.files?.Image && req.files?.Image3){
      let image=req.files.Image
        image.mv('./public/product-images/'+id+'.jpg')
      let image3=req.files.Image3
      image3.mv('./public/product-images3/'+id+'.jpg')
     }
     else if(req.files?.Image3 &&req.files?.Image2  ){
      let image=req.files.Image3
      image.mv('./public/product-images3/'+id+'.jpg')
    let image2=req.files.Image2
    image2.mv('./public/product-images2/'+id+'.jpg')
   }
   else if(req.files?.Image3  ){
    let image=req.files.Image3
    image.mv('./public/product-images3/'+id+'.jpg')
 
 }
 else if(req.files?.Image2  ){
  let image=req.files.Image2
  image.mv('./public/product-images2/'+id+'.jpg')

}
else if(req.files?.Image  ){
  let image=req.files.Image
  image.mv('./public/product-images/'+id+'.jpg')

}

     
   })
 })

 router.get('/view-users',verifyLogin,(req,res)=>{
 productHelpers.getAllUsers().then((users)=>{
   res.render('admin/view-users',{admin:true,users,user})
 })
 })
 router.get('/block-user/:id',verifyLogin,(req,res)=>{
   let userId=req.params.id
   productHelpers.blockUser(userId).then((response)=>{
   
     res.redirect('/admin/view-users')
   })
 })
 router.get('/unblock-user/:id',verifyLogin,(req,res)=>{
   let userId=req.params.id
   productHelpers.unblockUser(userId).then((response)=>{
     res.redirect('/admin/view-users')
   })
 })
 router.get('/view-category',verifyLogin,(req,res,next)=>{
  productHelpers.getAllCategory().then((category)=>{
    res.render('admin/view-category',{admin:true,category,user})
  })
})

router.get('/add-category',verifyLogin, function (req,res) {
  res.render('admin/add-category');
})

router.post('/add-category',verifyLogin,(req,res)=>{

 productHelpers.addCategory(req.body,(id)=>{
   let image=req.files.Image
  
   image.mv('./public/category-images/'+id+'.jpg',(err,done)=>{
    

     if(!err){

       res.render('admin/add-category')
     }else{
       console.log(err)
     }
    
})
 })
})

router.get('/delete-category/:id',verifyLogin,(req,res)=>{
  const userId=req.params.id
 
  productHelpers.deleteCategory(userId).then((response)=>{
    res.redirect('/admin/view-category')
  })
})

router.get('/edit-category/:id',verifyLogin, async (req,res)=>{
  let category= await productHelpers.getcategoryDetails(req.params.id)
 
  res.render('admin/edit-category',{category,admin:true});
})
router.post('/edit-category/:id',verifyLogin,(req,res)=>{
  let id=req.params.id
  productHelpers.updateCategory(req.params.id,req.body).then(()=>{
    res.redirect('/admin/view-category')
    if(req.files.Image){
     let image=req.files.Image
     image.mv('./public/category-images/'+id+'.jpg')
     
    }
  })
})

 router.get('/logout',(req,res)=>{
  req.session.admin=null
  req.session.adminLoggedIn=false
  res.redirect('/admin/admin-login')
})

router.get('/orderss',verifyLogin,(req,res)=>{
  productHelpers.getAllOrders().then((orders)=>{
    res.render('admin/orderss',{orders,admin:true,user})
  })
})

router.get('/orderProductDetails/:id',verifyLogin,async(req,res)=>{
 
  let products= await productHelpers.getOrderProductDetails(req.params.id)
  // let adm=req.session.adminLoggedIn
 
  res.render('admin/orderProductDetails',{products,admin:true,user})
})

router.post('/statusUpdate',(req,res)=>{
  let status=req.body.status
  let orderId=req.body.orderId
  
  
  productHelpers.statusUpdate(status,orderId).then((response)=>{
   res.json(true)
  })
})






router.get('/coupon',verifyLogin,(req,res)=>{
  productHelpers.getAllCoupons().then((coupons) => {
    res.render("admin/coupons", {
      admin:true,user,
      coupons,
      
    });
  });
})
router.post("/add-coupon", (req, res) => {
  productHelpers.addCoupon(req.body).then(() => {
    res.redirect("/admin/coupon");
  });
});

router.get("/delete-coupon/:id", (req, res) => {
  productHelpers.deleteCoupon(req.params.id).then(() => {
    res.redirect("/admin/coupon");
  });
});

router.get("/category-offers", async (req, res) => {
  let category = await productHelpers.getAllCategory();
  let catOffers = await productHelpers.getAllCatOffers();
  res.render("admin/category-offer", {
    admin: true,
    category,
    catOffers,
    
  });
});

router.get("/addCategory-offers", async (req, res) => {
  let category = await productHelpers.getAllCategory();
  res.render("admin/addCategory-offer", {
    admin: true,
    category
    
  });
});

router.post("/addCategory-offers", (req, res) => {
  productHelpers.addCategoryOffer(req.body).then(() => {
    res.redirect("/admin/category-offers");
  });
});

router.get("/delete-catOffer/:id", (req, res) => {
  productHelpers.deleteCatOffer(req.params.id).then(() => {
    res.redirect("/admin/category-offers");
  });
});

router.get('/filtered-orders',(req,res)=>{
  res.render('admin/order-filter')
})

module.exports = router;
