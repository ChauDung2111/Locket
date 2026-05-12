const cloudinary = require('../config/cloudinary');
const AppError = require('../utils/AppError');
const { v4: uuidv4 } = require('uuid');

// ── POST /api/presignedV3 ─────────────────────────────────
// Frontend gọi để lấy URL upload, sau đó tự upload file
// Với Cloudinary ta dùng upload_url thay vì presigned S3
exports.getPresigned = async (req, res, next) => {
  try {
    const { filename, contentType, type, size, uploadedAt } = req.body;

    if (!filename || !contentType) {
      return next(new AppError('Cần cung cấp filename và contentType.', 400));
    }

    // Giới hạn kích thước: 50MB
    const MAX_SIZE = 50 * 1024 * 1024;
    if (size && size > MAX_SIZE) {
      return next(new AppError('File quá lớn. Giới hạn tối đa 50MB.', 400));
    }

    const folder = `locket-dio/${type === 'video' ? 'videos' : 'images'}`;
    const publicId = `${folder}/${uuidv4()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const resourceType = type === 'video' ? 'video' : 'image';

    // Tạo Cloudinary upload signature (để frontend upload trực tiếp)
    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign = {
      folder,
      public_id: publicId.split('/').pop(),
      timestamp,
      upload_preset: undefined,
    };

    const signature = cloudinary.utils.api_sign_request(
      { folder, public_id: paramsToSign.public_id, timestamp },
      process.env.CLOUDINARY_API_SECRET
    );

    // Public URL sau khi upload
    const publicURL = cloudinary.url(publicId, {
      resource_type: resourceType,
      secure: true,
    });

    // Upload URL cho frontend (Cloudinary unsigned upload endpoint)
    const uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

    return res.json({
      success: true,
      data: {
        // Thông tin để frontend POST lên Cloudinary trực tiếp
        url: uploadUrl,
        publicURL,
        key: publicId,
        expiresIn: 3600,
        // Fields cần gửi kèm khi upload
        fields: {
          api_key: process.env.CLOUDINARY_API_KEY,
          public_id: paramsToSign.public_id,
          folder,
          timestamp,
          signature,
        },
        resourceType,
      },
    });
  } catch (err) { next(err); }
};

// ── POST /api/upload (multipart, dùng nội bộ) ────────────
exports.uploadDirect = async (req, res, next) => {
  try {
    if (!req.file) return next(new AppError('Không có file được gửi lên.', 400));

    const isVideo = req.file.mimetype.startsWith('video/');
    const folder = `locket-dio/${isVideo ? 'videos' : 'images'}`;

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: isVideo ? 'video' : 'image' },
        (err, result) => { if (err) reject(err); else resolve(result); }
      );
      const streamifier = require('streamifier');
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    return res.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        duration: result.duration || null,
        size: result.bytes,
        resourceType: result.resource_type,
      },
    });
  } catch (err) { next(err); }
};
