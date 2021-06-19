const Category = require('../models/category');
const Link = require('../models/link');
const slugify = require('slugify');
const formidable = require('formidable');
const aws = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// s3
const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// exports.create = (req, res) => {
//     let form = new formidable.IncomingForm();
//     form.parse(req, (err, fields, files) => {
//         if(err) {
//             return res.status(400).json({
//                 error: 'Image could not upload'
//             })
//         }
//         // console.table({err, fields, files});
//         const {name, content} = fields;
//         const {image} = files;

        // const slug = slugify(name);
        // let category = new Category({name, content, slug});
//         if (image.size > 2000000) {
//             return res.status(400).json({
//                 error: 'Image should be less than 2mb'
//             })
//         }
        // // upload image to S3
        // const params = {
        //     Bucket: 'hackr-sirnobles',
        //     Key: `category/${uuidv4()}`,
        //     Body: fs.readFileSync(image.path),
        //     ACL: 'public-read',
        //     ContentType: `image/jpg`
        // }

        // s3.upload(params, (err, data) => {
        //     if(err) res.status(400).json({
        //         error: 'Upload to S3 failed'
        //     })
        //     console.log('AWS UPLOAD RES DATA', data);
        //     category.image.url = data.Location;
        //     category.image.key = data.Key;

        //     //save to database
        //     category.save((err, success) => {
        //         if(err) res.status(400).json({
        //             error: 'Duplicate category'
        //         })
        //         return res.json(success);
        //     })
        // });
//     })
// };

exports.create = (req, res) => {
    const {name, image, content} = req.body;
    // image data
    const base64Data = new Buffer.from(image.replace(/^data:image\/\w+;base64,/,''), 'base64');
    const  type = image.split(';')[0].split('/')[1];

    const slug = slugify(name);
    let category = new Category({name, content, slug});

    // upload image to S3
    const params = {
        Bucket: 'hackr-sirnobles',
        Key: `category/${uuidv4()}.${type}`,
        Body: base64Data,
        ACL: 'public-read',
        ContentEncoding: 'base64',
        ContentType: `image/${type}`
    }

    s3.upload(params, (err, data) => {
        if(err) res.status(400).json({
            error: 'Upload to S3 failed'
        })
        console.log('AWS UPLOAD RES DATA', data);
        category.image.url = data.Location;
        category.image.key = data.Key;

        // posted by
        category.postedBy = req.user._id;

        //save to database
        category.save((err, success) => {
            if(err) res.status(400).json({
                error: 'Duplicate category'
            })
            return res.json(success);
        })
    });
};

exports.list = (req, res) => {
    Category.find({}).exec((err, data) => {
        if(err) {
            return res.status(400).json({
                error: 'Categories could not load.'
            })
        }
        res.json(data);
    })
};

exports.read = (req, res) => {
    const { slug } = req.params;
    let limit = req.body.limit ? parseInt(req.body.limit) : 10;
    let skip = req.body.skip ? parseInt(req.body.skip) : 0;

    Category.findOne({slug})
    .populate('postedBy', '_id name username')
    .exec((err, category) => {
        if(err) {
            return res.status(400).json({
                error: 'Could not load category'
            })
        }
        // res.json(category);
        Link.find({ categories: category })
        .populate('postedBy', '_id name username')
        .populate('categories', 'name')
        .sort({createdAt: -1})
        .limit(limit)
        .skip(skip)
        .exec((err, links) => {
            if(err) {
                return res.status(400).json({
                    error: 'Could not load links from the selected category'
                })
            }
            res.json({category, links});
        })
    })
};

exports.update = (req, res) => {
    const {slug} = req.params;
    const {name, image, content} = req.body;

    // image data
    const base64Data = new Buffer.from(image.replace(/^data:image\/\w+;base64,/,''), 'base64');
    const  type = image.split(';')[0].split('/')[1];

    Category.findOneAndUpdate({slug}, {name, content}, {new: true}).exec((err, updated)  => {
        if (err) {
            return res.status(400).json({
                error: 'Could not find category to update'
            });
        }
        console.log('UPDATED', updated);
        if(image) {
            // remove the current image from S3 before uploading the new one
            const deleteParams = {
                Bucket: 'hackr-sirnobles',
                Key: `${updated.image.key}`,
            };
        
            s3.deleteObject(deleteParams, function(err, data)  {
                if (err) console.log('s3 delete error during update', err);
                else console.log('S3 deleted during update', data);
            });

            // handle upload image
            const params = {
                Bucket: 'hackr-sirnobles',
                Key: `category/${uuidv4()}.${type}`,
                Body: base64Data,
                ACL: 'public-read',
                ContentEncoding: 'base64',
                ContentType: `image/${type}`
            }

            s3.upload(params, (err, data) => {
                if(err) res.status(400).json({
                    error: 'Upload to S3 failed'
                })
                console.log('AWS UPLOAD RES DATA', data);
                updated.image.url = data.Location;
                updated.image.key = data.Key;
        
                //save to database
                updated.save((err, success) => {
                    if(err) res.status(400).json({
                        error: 'Duplicate category'
                    })
                    res.json(success);
                })
            });
        } else {
            res.json(updated);
        }
    })
};

exports.remove = (req, res) => {
    const {slug} = req.params;

    Category.findOneAndRemove({slug}).exec((err, data) => {
        if (err) {
            return res.status(400).json({
                error: 'Could not delete category'
            })
        }
        const deleteParams = {
            Bucket: 'hackr-sirnobles',
            Key: `${data.image.key}`,
        };
    
        s3.deleteObject(deleteParams, function(err, data)  {
            if (err) console.log('s3 delete error', err);
            else console.log('S3 deleted', data);
        });

        res.json({
            message: 'Category deleted successfully'
        })
    })
};