'use strict';

var request = require('request');
var _ = require('lodash');
var fs = require('fs');
var sizesList = [{
	name: 'size',
	value: 'S,M,L,XL'
}];
var from = 1;
var to = 50;
var writeStream = fs.createWriteStream('../public/assets/files/products.csv');
var headers = 'ID,Type,SKU,Name,Published,"Is featured?","Visibility in catalog","Short description",Description,"Date sale price starts",' +
'"Date sale price ends","Tax status","Tax class","In stock?",Stock,"Backorders allowed?","Sold individually?","Weight (lbs)","Length (in)","Width (in)",' +
'"Height (in)","Allow customer reviews?","Purchase note","Sale price","Regular price",Categories,Tags,"Shipping class",Images,"Download limit",' +
'"Download expiry days",Parent,"Grouped products",Upsells,Cross-sells,"External URL","Button text",Position,"Attribute 1 name","Attribute 1 value(s)",' +
'"Attribute 1 visible","Attribute 1 global","Attribute 2 name","Attribute 2 value(s)","Attribute 2 visible","Attribute 2 global",' +
'"Meta: _wpcom_is_markdown","Download 1 name","Download 1 URL","Download 2 name","Download 2 URL"\n';
writeStream.write(headers);
function getProducts() {
	var url = 'https://site.vtexcommercestable.com.br/api/catalog_system/pvt/products/GetProductAndSkuIds?_from=' + from + '&_to=' + to;
	var headers = {
		'X-VTEX-API-AppKey': 'vtexappkey-site-TOKEN',
		'X-VTEX-API-AppToken': 'TOKENTOKENTOKENTOKENTOKENTOKENTOKENTOKENTOKENTOKENTOKENTOKENTOKENTOKENTOKENTOKENTOKENTOKENTOKENTOKENTOKENTOKENTOKENTOKENTOKENTOK'
	};

	request({
		url: url,
		method: 'GET',
		json: true,
		headers: headers
	}, function(error, response, body) {
		console.log('1');
		console.log(url);
		console.log('error');console.log(JSON.stringify(error));
		console.log('response');console.log(JSON.stringify(response));
		console.log('body');console.log(JSON.stringify(body));
		var products;

		if (error) {
			console.log(JSON.stringify(error));
		} else {
			products = Object.keys(body.data);
			if (products && products.length > 0) {
				(function getProductInformation() {
					var product;
					var lineProduct;

					if (products.length > 0) {
						product = products.shift();
						url = 'https://site.vtexcommercestable.com.br/api/catalog_system/pvt/products/ProductGet/' + product;
						request({
							url: url,
							method: 'GET',
							json: true,
							headers: headers
						}, function(error, response, body) {
							var productInformation = body;
							console.log('2');
							console.log(url);
							console.log('error');console.log(JSON.stringify(error));
							console.log('response');console.log(JSON.stringify(response));
							console.log('body');console.log(JSON.stringify(body));
							var categoryTree;

							if (error) {
								console.log(JSON.stringify(error));
							} else if (response.statusCode == '504') {
								products.unshift(product);
								setTimeout(getProductInformation, 5*1000);
							} else {
								(function getCategory(categoryId) {
									url = 'https://site.vtexcommercestable.com.br/api/catalog_system/pvt/category/' + categoryId;
									request({
										url: url,
										method: 'GET',
										json: true,
										headers: headers
									}, function(error, response, body) {
										console.log('3');
										console.log(url);
										console.log('error');console.log(JSON.stringify(error));
										console.log('response');console.log(JSON.stringify(response));
										console.log('body');console.log(JSON.stringify(body));
										if (error) {
											console.log(JSON.stringify(error));
										} else {
											if (categoryTree) {
												categoryTree = body.name + '->' + categoryTree;
											} else {
												categoryTree = body.name;
											}
											if (body.parentId != null) {
												getCategory(body.parentId);
											} else {
												url = 'https://site.vtexcommercestable.com.br/api/catalog_system/pub/products/variations/' + product;
												request({
													url: url,
													method: 'GET',
													json: true,
													headers: headers
												}, function(error, response, body) {
													console.log('4');
													console.log(url);
													console.log('error');console.log(JSON.stringify(error));
													console.log('response');console.log(JSON.stringify(response));
													console.log('body');console.log(JSON.stringify(body));
													var attributesAlreadyExist;
													var designerAdded = false;
													var lineVariant;
													var attributes;
													var attribute;
													var sizes = {
														name: '',
														value: ''
													};
													var i;

													if (error || response.statusCode == '404') {
														console.log(JSON.stringify(error));
														lineProduct = productInformation.Id + ',' + 'simple' + ',' + (productInformation.Id + 'ABC-' + productInformation.Id) + ',"' + productInformation.Name + '",1,0,visible,' + productInformation.DescriptionShort + ',"' + productInformation.Description + '",,,taxable,,' +
														'0,,0,1,,,,,1,,,,' + categoryTree + ',"' + productInformation.KeyWords + '",,,,,,,,,,,,,,,,,,,,,,,,\n';
														getProductInformation();
													} else {
														attributes = body.skus;
														if (attributes && attributes.length > 0) {
															for (i = 0; i < attributes.length; i += 1) {
																if (sizesList.length > 0) {
																	sizes = _.find(sizesList, function(alreadyCreatedList) {
																		var values = (alreadyCreatedList.value).split(",");
																		return (_.some(values, function(value) {
																			return (value.toLowerCase() == (attributes[i].skuname).toLowerCase());
																		}));
																	});
																	if (sizes) {
																		attributesAlreadyExist = true;
																	} else {
																		sizes = {
																			name: '',
																			value: ''
																		};
																		attributesAlreadyExist = false;
																	}
																	if (!attributesAlreadyExist && i == (attributes.length - 1)) {
																		break;
																	}
																} else {
																	attributesAlreadyExist = false;
																	break;
																}
															}
															if (!attributesAlreadyExist) {
																for (i = 0; i < attributes.length; i += 1) {
																	if (i == (attributes.length - 1)) {
																		sizes.value = sizes.value + attributes[i].skuname;
																	} else {
																		sizes.value = sizes.value + attributes[i].skuname + ',';
																	}
																}
																sizes.name = 'size_' + productInformation.Id;
																sizesList.push(sizes);
															}
															i = 0;
															(function getImagesAndBrand() {
																var groupedIds = [];

																if (attributes[i]) {
																	attribute = attributes[i];
																	url = 'https://site.vtexcommercestable.com.br/api/catalog_system/pvt/sku/stockkeepingunitbyid/' + attribute.sku;

																	request({
																		url: url,
																		method: 'GET',
																		json: true,
																		headers: headers
																	}, function(error, response, body) {
																		console.log('5');console.log(url);
																		console.log('error');console.log(JSON.stringify(error));
																		console.log('response');console.log(JSON.stringify(response));
																		console.log('body');console.log(JSON.stringify(body));
																		var images = [];
																		var j;

																		if (error) {
																			console.log(error);
																		}  else if (response.statusCode == '504' || response.statusCode == '500') {
																			setTimeout(getImagesAndBrand, 5*1000);
																		} else {
																			for (j = 0; j < body.Images.length; j += 1) {
																				images.push(body.Images[j].ImageUrl);
																			}
																			attribute.images = images;
																			attribute.isKit = body.IsKit;
																			attribute.kitItems = body.KitItems;
																			if (!designerAdded) {
																				designerAdded = true;
																				categoryTree = categoryTree + ',' + body.BrandName;
																			}
																			i += 1;
																			getImagesAndBrand();
																		}
																	});
																} else {
																	console.log('categorytree');console.log(categoryTree);
																	console.log('images');console.log(JSON.stringify(attribute.images));
																	if (attribute.isKit) {
																		(function getKitItem() {
																			var item = (attribute.kitItems).shift();
																			var refId = '';
																			var words;

																			if (item) {
																				url = 'https://site.vtexcommercestable.com.br/api/catalog_system/pvt/sku/stockkeepingunitbyid/' + item.Id;

																				request({
																					url: url,
																					method: 'GET',
																					json: true,
																					headers: headers
																				}, function(error, response, body) {
																					console.log('6');console.log(url);
																					console.log('error');console.log(JSON.stringify(error));
																					console.log('response');console.log(JSON.stringify(response));
																					console.log('body');console.log(JSON.stringify(body));
																					groupedIds.push(body.ProductId);
																					getKitItem();
																				});
																			} else {
																				console.log('grouped before');console.log(JSON.stringify(groupedIds));
																				for (i = 0; i < groupedIds.length; i += 1) {
																					groupedIds[i] = groupedIds[i] + 'ABC-' + groupedIds[i];
																				}
																				console.log('grouped after');console.log(JSON.stringify(groupedIds));
																				lineProduct = productInformation.Id + ',' + 'grouped' + ',' + (productInformation.Id + 'ABC-' + productInformation.Id) + ',"' + productInformation.Name + '",1,0,visible,' + productInformation.DescriptionShort + ',"' + productInformation.Description + '",,,taxable,,' +
																				'0,,0,1,,,,,1,,,,"' + categoryTree + '","' + productInformation.KeyWords + '",,"' + attribute.images.toString() + '",,,,"' + groupedIds.toString() + '",,,,,,' + sizes.name + ',"' + sizes.value + '",1,1,,,,,,,,,\n';
																				writeStream.write(lineProduct);
																				getProductInformation();
																			}
																		})();
																	} else { //it's variable
																		lineProduct = productInformation.Id + ',' + 'variable' + ',' + (productInformation.Id + 'ABC-' + productInformation.Id) + ',"' + productInformation.Name + '",1,0,visible,' + productInformation.DescriptionShort + ',"' + productInformation.Description + '",,,taxable,,' +
																		'0,,0,1,,,,,1,,,,"' + categoryTree + '","' + productInformation.KeyWords + '",,"' + attribute.images.toString() + '",,,,,,,,,,' + sizes.name + ',"' + sizes.value + '",1,1,,,,,,,,,\n';
																		writeStream.write(lineProduct);
																		for (i = 0; i < attributes.length; i += 1) {
																			attribute = attributes[i];
																			lineVariant = (parseInt(productInformation.Id) + (i + 1)) + ',variation,' + (productInformation.Id + 'ABC' + attribute.sku) + ',"' + (productInformation.Name +  ' - ' + attribute.skuname) + '",1,0,visible,' + productInformation.DescriptionShort + ',"' + productInformation.Description + '",,,taxable,,' +
																			(attribute.available ? '1' : '0') + ',' + attribute.availablequantity + ',0,1,' + attribute.measures.weight + ',' + attribute.measures.length + ',' + attribute.measures.width + ',' + attribute.measures.height +
																			 ',1,,,"' + attribute.bestPriceFormated + '","' + categoryTree + '","' + productInformation.KeyWords + '",,"' + attribute.images.toString() + '",,,' + (productInformation.Id + 'ABC-' + productInformation.Id) +',,,,,,,' + sizes.name + ',"' + attribute.skuname + '",1,1,,,,,,,,,\n';
																			writeStream.write(lineVariant);
																		}
																		getProductInformation();
																	}
																}
															})();
														} else {
															lineProduct = productInformation.Id + ',' + 'simple' + ',' + (productInformation.Id + 'ABC-' + productInformation.Id) + ',"' + productInformation.Name + '",1,0,visible,' + productInformation.DescriptionShort + ',"' + productInformation.Description + '",,,taxable,,' +
															'0,,0,1,,,,,1,,,,"' + categoryTree + '","' + productInformation.KeyWords + '",,,,,,,,,,,,,,,,,,,,,,,,\n';
															getProductInformation();
														}
													}
												});
											}
										}
									});
								})(productInformation.CategoryId);

							}
						});
					} else {
						from += 50;
						to += 50;
						getProducts();
					}
				})();
			} else {
				writeStream.end();
			}
		}
	});
};

getProducts();
