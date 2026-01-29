// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EmployeeContract {
    struct Employee {
        string userCode;
        string fullName;
        string email;
        string phone;
        string department;
        string position;
        address wallet;
        uint256 createdAt;
        bool active;
    }

    address public owner;
    uint256 public employeeCount;

    // Map userCode → Employee
    mapping(string => Employee) private employees;
    // Danh sách userCode để dễ iterate
    string[] private employeeCodes;
    
    // Theo dõi tổng số ETH đã được ghi có và rút (tính bằng wei)
    mapping(string => uint256) private totalCredited;
    mapping(string => uint256) private totalWithdrawn;

    struct LogEntry {
        uint256 timestamp;
        uint8 action; // 0 = credit, 1 = withdraw
        uint256 amount; // wei
    }

    // Lưu log cho mỗi userCode
    mapping(string => LogEntry[]) private logs;

    event EmployeeRegistered(string userCode, string fullName, address wallet);
    event EmployeeStatusChanged(string userCode, bool active);
    event EmployeeCredited(string userCode, uint256 amount, uint256 timestamp);
    event EmployeeWithdrawn(string userCode, uint256 amount, uint256 timestamp);
    event EmployeePurchased(string userCode, uint256 totalAmount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
        employeeCount = 0;
    }

    // Đăng ký nhân viên mới
    function registerEmployee(
        string memory userCode,
        string memory fullName,
        string memory email,
        string memory phone,
        string memory department,
        string memory position,
        address wallet
    ) public onlyOwner {
        require(employees[userCode].wallet == address(0), "Employee already exists");
        require(wallet != address(0), "Invalid wallet address");

        Employee memory emp = Employee({
            userCode: userCode,
            fullName: fullName,
            email: email,
            phone: phone,
            department: department,
            position: position,
                wallet: wallet,
            createdAt: block.timestamp,
            active: true
        });

        employees[userCode] = emp;
        employeeCodes.push(userCode);
        employeeCount++;

        emit EmployeeRegistered(userCode, fullName, wallet);
    }

    // Ghi nhận khoản tiền lương/credit cho nhân viên dựa trên khoảng thời gian checkin/checkout
    // amount tính tự động: mỗi 1 phút = 0.1 ETH
    function creditForWork(string memory userCode, uint256 checkin, uint256 checkout) public onlyOwner {
        require(employees[userCode].wallet != address(0), "Employee not found");
        require(checkout >= checkin, "Invalid time range");

        uint256 secondsWorked = checkout - checkin;
        uint256 minutesWorked = secondsWorked / 60;
        if (minutesWorked == 0) {
            return; // Không credit nếu dưới 1 phút
        }

        uint256 amountPerMinute = 100000000000000000; // 0.1 ETH in wei
        uint256 amount = minutesWorked * amountPerMinute;

        totalCredited[userCode] += amount;
        logs[userCode].push(LogEntry({timestamp: block.timestamp, action: 0, amount: amount}));
        emit EmployeeCredited(userCode, amount, block.timestamp);
    }

    // Ghi nhận hành động rút tiền (để contract làm sổ sách). Việc chuyển ETH thực tế
    // được xử lý off-chain bởi backend (ví nhân viên dùng private key để ký TX). Chỉ
    // owner (server) có quyền ghi nhận rút tiền này trên blockchain.
    function recordWithdraw(string memory userCode, uint256 amount) public onlyOwner {
        require(employees[userCode].wallet != address(0), "Employee not found");
        totalWithdrawn[userCode] += amount;
        logs[userCode].push(LogEntry({timestamp: block.timestamp, action: 1, amount: amount}));
        emit EmployeeWithdrawn(userCode, amount, block.timestamp);
    }

    // Ghi nhận mua sản phẩm (để tracking purchase history)
    function recordPurchase(string memory userCode, uint256 totalAmount) public onlyOwner {
        require(employees[userCode].wallet != address(0), "Employee not found");
        logs[userCode].push(LogEntry({timestamp: block.timestamp, action: 2, amount: totalAmount}));
        emit EmployeePurchased(userCode, totalAmount, block.timestamp);
    }

    // Lấy số dư theo sổ sách (tổng ghi có - tổng rút)
    function getEmployeeBookBalance(string memory userCode) public view returns (uint256) {
        require(employees[userCode].wallet != address(0), "Employee not found");
        return totalCredited[userCode] - totalWithdrawn[userCode];
    }

    // Truy xuất số lượng log và log từng phần tử
    function getLogCount(string memory userCode) public view returns (uint256) {
        require(employees[userCode].wallet != address(0), "Employee not found");
        return logs[userCode].length;
    }

    function getLogByIndex(string memory userCode, uint256 index) public view returns (uint256, uint8, uint256) {
        require(employees[userCode].wallet != address(0), "Employee not found");
        require(index < logs[userCode].length, "Index out of bounds");
        LogEntry memory e = logs[userCode][index];
        return (e.timestamp, e.action, e.amount);
    }

    // Cập nhật trạng thái hoạt động của nhân viên
    function updateEmployeeStatus(string memory userCode, bool isActive) public onlyOwner {
        require(employees[userCode].wallet != address(0), "Employee not found");
        employees[userCode].active = isActive;
        emit EmployeeStatusChanged(userCode, isActive);
    }

    // Lấy thông tin 1 nhân viên
    function getEmployee(string memory userCode)
        public
        view
        returns (
            string memory,
            string memory,
            string memory,
            string memory,
            string memory,
            string memory,
            address,
            uint256,
            bool
        )
    {
        Employee memory emp = employees[userCode];
        require(emp.wallet != address(0), "Employee not found");
        return (
            emp.userCode,
            emp.fullName,
            emp.email,
            emp.phone,
            emp.department,
            emp.position,
            emp.wallet,
            emp.createdAt,
            emp.active
        );
    }

    // Lấy danh sách tất cả nhân viên
    function getAllEmployees()
        public
        view
        returns (Employee[] memory)
    {
        Employee[] memory list = new Employee[](employeeCount);
        for (uint256 i = 0; i < employeeCount; i++) {
            list[i] = employees[employeeCodes[i]];
        }
        return list;
    }

    // Lấy số dư ETH thật của ví nhân viên
    function getEmployeeBalance(string memory userCode) public view returns (uint256) {
        address wallet = employees[userCode].wallet;
        require(wallet != address(0), "Employee not found");
        return wallet.balance;
    }
}
