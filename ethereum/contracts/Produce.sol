pragma solidity ^0.4.25;
contract ProduceFactory {
    address[] public deployedProduces;
    address public lastProduce;
    function newProduce(string memory _farmerId, string memory _location,
                                    string memory _cropName) public{
        address newProd = new Produce(_farmerId,_location,_cropName);
        lastProduce=newProd;
        deployedProduces.push(newProd);
    }

    function getAllDeployedProduces() public view returns (address[]){
        return deployedProduces;
    }
}

contract Produce{
    //OneProduce[] produces;
    address public produceId;
    string public farmerID;//farmer id from login username
    string public location;//gps or mannually
    string public cropName;//mannually
    uint256 public cropQty;//integer denoting cropQty
    string public timeStamp;//flutter
    string public dispatchDate;//should be current or farmer enter the mannually
    string public fertilizerName;
    string public fertilizer_type="unverified";

    string public govID;

    string public foodProcessor;
    string public crop_FP_Timestamp;
    uint256 public quantityReceived;
    uint256 public msp;//fetched from api or web static or government portal
    bool public adulterationTest;
    uint256 public finalPrice;
    string public expiryDate;
    address public barcode;

    //struct for retailer
    struct Retailer{
        string retailerId;
        string retailer_address;
        uint256 qty;
        string dispatch_timestamp;
        string newBarcode; //barcode, retailer_id, qty, dispatch_timestamp
        string receiving_timestamp;
    }
    //array of structs
    mapping(string=>Retailer) retailers;

    //CONSTRUCTOR AND initHalfVars ARE FOR INITIALIZING VARS
    constructor(string memory _farmerId, string memory _location, string memory _cropName) public{
        produceId=address(this);
        farmerID=_farmerId;
        location=_location;
        cropName=_cropName;
        barcode=address(this);
    }
    function initHalfVars(uint256 _cropQty,string memory _timeStamp, string memory _fertilizerName, string memory _foodprocessor, string memory _expiryDate) public payable {
        cropQty=_cropQty;
        timeStamp=_timeStamp;
        fertilizerName=_fertilizerName;
        foodProcessor=_foodprocessor;
        expiryDate=_expiryDate;
    }


    //FARMER FUNCS
        //1. FUNC FOR FARMER TO SEE UNSENT PRODUCE SCREEN (HAVING DISPATCH NOW BTN)
    function getDataBeforeDispatch() public view returns (address,string memory, uint, string memory, string memory, string memory){
        return(
            produceId,
            cropName,
            cropQty,
            fertilizerName,
            foodProcessor,
            fertilizer_type
        );
    }

    //2. UPDATE dispatchDate ON "DISPATCH NOW" CLICK
    function dispatchProduce(string memory _dispatchDate) public payable{
        dispatchDate=_dispatchDate;
    }

    //====================================FP FUNCS=====================================================
        //1. SCREEN CONTAINING THE BTN "received now"
    function getDataBeforeReceivedByFp() public view returns (string, string, uint256) {
        return (
            cropName,
            dispatchDate,
            cropQty
        );
    }
        //2. AFTER RECEIVING, UPDATE dispatchDate
    function FPReceivesCrop(string _crop_FP_timestamp,uint256 _quantityReceived) public {
        crop_FP_Timestamp=_crop_FP_timestamp;
        quantityReceived=_quantityReceived;
    }

        //3. FP completes processing
    function processingComplete(uint256 _msp, uint256 _finalPrice, bool _adulterationTest) public  {
        msp=_msp;
        finalPrice=_finalPrice;
        adulterationTest=_adulterationTest;
    }

        //4. FP sends to retailer : returns crop name, qty
    function getRemainingQty() public view returns (string, uint256){
        return (
            cropName,
            cropQty
        );
    }

        //5. FP enters retailer id and qty
    function addRetailer(string _retailerId, string _retailer_address, uint256 _qty, string _dispatch_timestamp, string _newBarcode) public{
        cropQty=_qty; //SUBTRACT IN API
        Retailer memory newRetailer = Retailer({
            retailerId:_retailerId,
            retailer_address:_retailer_address,
            qty:_qty,
            dispatch_timestamp:_dispatch_timestamp,
            newBarcode:_newBarcode,
            receiving_timestamp:" "
        });
        retailers[_retailerId] = newRetailer;
    }


        //6. RETAILER UPDATES timeStamp UPON RECEIVING
     function receiverTimestamp(string _id, string _receiving_timestamp) public payable {
         retailers[_id].receiving_timestamp=_receiving_timestamp;

     }

        //7. GOVT id
        function setFertilizerType(string _govId, string _fertilizerType) public payable{
            govID=_govId;
            fertilizer_type=_fertilizerType;
        }


          //8. COMMON FUNC TO DISP ALL DETAILS
    function showAllDetails1() public view returns (address,string,string,string,uint256){
        return (
            produceId,
            farmerID,//farmer id from login username
            location,//gps or mannually
             cropName,//mannually
            cropQty//integer denoting cropQty
       );
    }

    function showAllDetails3() public view returns (string,string,string,string,string){
        return (

            timeStamp,//flutter
            dispatchDate,//should be current or farmer enter the mannually
            fertilizerName,
            fertilizer_type,
            govID
       );
    }

    function showAllDetails2() public view returns (string,string,uint256,uint256,bool,uint256,string,address){
        return (
             foodProcessor,
            crop_FP_Timestamp,
            quantityReceived,
            msp,//fetched from api or web static or government portal
            adulterationTest,
            finalPrice,
            expiryDate,
            barcode
       );
    }

    function showRetailerDetails(string _retailerId) public view returns (string, uint256, string, string, string) {
        Retailer memory ret = retailers[_retailerId];
        return (
            ret.retailer_address,
            ret.qty,
            ret.dispatch_timestamp,
            ret.newBarcode,
            ret.receiving_timestamp
        );
    }
}
