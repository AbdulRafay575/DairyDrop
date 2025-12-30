const Product = require('../models/Product');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Build query
    let query = { isAvailable: true };

    // Category filter
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Brand filter
    if (req.query.brand) {
      query.brand = new RegExp(req.query.brand, 'i');
    }

    // Price range filter
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {};
      if (req.query.minPrice) query.price.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) query.price.$lte = parseFloat(req.query.maxPrice);
    }

    // Fat content filter
    if (req.query.minFat || req.query.maxFat) {
      query['nutritionalFacts.fatContent'] = {};
      if (req.query.minFat) query['nutritionalFacts.fatContent'].$gte = parseFloat(req.query.minFat);
      if (req.query.maxFat) query['nutritionalFacts.fatContent'].$lte = parseFloat(req.query.maxFat);
    }

    // Search
    if (req.query.search) {
      query.$or = [
        { name: new RegExp(req.query.search, 'i') },
        { description: new RegExp(req.query.search, 'i') },
        { brand: new RegExp(req.query.search, 'i') }
      ];
    }

    // Sort
    let sort = {};
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'price-low':
          sort = { price: 1 };
          break;
        case 'price-high':
          sort = { price: -1 };
          break;
        case 'rating':
          sort = { 'rating.average': -1 };
          break;
        case 'newest':
          sort = { createdAt: -1 };
          break;
        default:
          sort = { createdAt: -1 };
      }
    } else {
      sort = { createdAt: -1 };
    }

    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products'
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: { product }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product'
    });
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      brand,
      nutritionalFacts,
      shelfLife,
      storageInstructions,
      quantity,
      unit,
      tags
    } = req.body;

    // Basic validation
    if (!name || !description || !price || !category || !brand || !shelfLife || !quantity || !unit) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const product = await Product.create({
      name,
      description,
      price: parseFloat(price),
      category,
      brand,
      nutritionalFacts: nutritionalFacts ? JSON.parse(nutritionalFacts) : {},
      shelfLife: parseInt(shelfLife),
      storageInstructions: storageInstructions || 'Store in refrigerator at 4°C or below',
      quantity: parseInt(quantity),
      unit,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      images: req.files ? req.files.map(file => ({
        url: `/uploads/products/${file.filename}`,
        alt: name
      })) : []
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating product'
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const updateData = { ...req.body };

    // Parse nutritional facts if provided
    if (req.body.nutritionalFacts) {
      updateData.nutritionalFacts = JSON.parse(req.body.nutritionalFacts);
    }

    // Parse tags if provided
    if (req.body.tags) {
      updateData.tags = req.body.tags.split(',').map(tag => tag.trim());
    }

    // Handle numeric fields
    if (req.body.price) updateData.price = parseFloat(req.body.price);
    if (req.body.shelfLife) updateData.shelfLife = parseInt(req.body.shelfLife);
    if (req.body.quantity) updateData.quantity = parseInt(req.body.quantity);

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => ({
        url: `/uploads/products/${file.filename}`,
        alt: updateData.name || product.name
      }));
      updateData.images = [...product.images, ...newImages];
    }

    product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating product'
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Instead of deleting, mark as unavailable
    product.isAvailable = false;
    await product.save();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting product'
    });
  }
};

// @desc    Get product categories
// @route   GET /api/products/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category', { isAvailable: true });
    
    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
};

// @desc    Get brands
// @route   GET /api/products/brands
// @access  Public
const getBrands = async (req, res) => {
  try {
    const brands = await Product.distinct('brand', { isAvailable: true });
    
    res.json({
      success: true,
      data: { brands }
    });
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching brands'
    });
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getBrands
};