// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ProductContract {
    struct Product {
        string productCode;
        string name;
        uint256 price; // price in wei
        string image; // IPFS hash
        bool exists;
    }

    address public owner;
    uint256 public productCount;

    mapping(string => Product) private products;
    string[] private productCodes;

    event ProductAdded(string productCode, string name, uint256 price, string image);
    event ProductUpdated(string productCode, string name, uint256 price, string image);
    event ProductDeleted(string productCode);
    event ProductPurchased(string productCode, address buyer, uint256 price, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
        productCount = 0;
    }

    function addProduct(string memory productCode, string memory name, uint256 price, string memory image) public onlyOwner {
        require(!products[productCode].exists, "Product already exists");
        Product memory p = Product({
            productCode: productCode,
            name: name,
            price: price,
            image: image,
            exists: true
        });
        products[productCode] = p;
        productCodes.push(productCode);
        productCount++;
        emit ProductAdded(productCode, name, price, image);
    }

    function updateProduct(string memory productCode, string memory name, uint256 price, string memory image) public onlyOwner {
        require(products[productCode].exists, "Product not found");
        Product storage p = products[productCode];
        p.name = name;
        p.price = price;
        p.image = image;
        emit ProductUpdated(productCode, name, price, image);
    }

    function deleteProduct(string memory productCode) public onlyOwner {
        require(products[productCode].exists, "Product not found");
        products[productCode].exists = false;
        emit ProductDeleted(productCode);
    }

    function getProduct(string memory productCode) public view returns (string memory, string memory, uint256, string memory) {
        require(products[productCode].exists, "Product not found");
        Product memory p = products[productCode];
        return (p.productCode, p.name, p.price, p.image);
    }

    function getAllProducts() public view returns (Product[] memory) {
        // First, count active products (where exists = true)
        uint256 activeCount = 0;
        for (uint256 i = 0; i < productCodes.length; i++) {
            if (products[productCodes[i]].exists) {
                activeCount++;
            }
        }

        // Create array with correct size
        Product[] memory list = new Product[](activeCount);
        uint256 index = 0;

        // Fill array with only active products
        for (uint256 i = 0; i < productCodes.length; i++) {
            if (products[productCodes[i]].exists) {
                list[index] = products[productCodes[i]];
                index++;
            }
        }
        return list;
    }

    // Buy multiple products with quantities in a single transaction
    function buyProducts(string[] memory productCodes, uint256[] memory quantities) public payable {
        require(productCodes.length == quantities.length, "Code and quantity arrays must match");
        require(productCodes.length > 0, "Must buy at least one product");

        uint256 totalPrice = 0;

        // Calculate total price
        for (uint256 i = 0; i < productCodes.length; i++) {
            require(products[productCodes[i]].exists, "Product not found");
            require(quantities[i] > 0, "Quantity must be greater than zero");
            uint256 itemPrice = products[productCodes[i]].price * quantities[i];
            totalPrice += itemPrice;
        }

        require(msg.value == totalPrice, "Incorrect total payment amount");

        // Transfer received ETH to owner
        payable(owner).transfer(msg.value);

        // Emit event for each product purchased
        for (uint256 i = 0; i < productCodes.length; i++) {
            emit ProductPurchased(productCodes[i], msg.sender, products[productCodes[i]].price * quantities[i], block.timestamp);
        }
    }
}