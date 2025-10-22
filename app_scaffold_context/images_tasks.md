### **PR \#15: Image Upload & Display**

#### **Task 15.1: Add Image Picker to InputToolbar**

**Description**: Allow users to select and send images  
 **Git Actions**:

git checkout master && git pull

git checkout \-b feature/image-upload

**Files Modified**:

* `mobile/components/chat/InputToolbar.tsx`

**Implementation Steps**:

* \[ \] Add image picker button (camera icon)  
* \[ \] Use Expo ImagePicker to select image  
* \[ \] Compress image before upload  
* \[ \] Show upload progress indicator  
* \[ \] Send image message after upload

---

#### **Task 15.2: Create Media Upload Endpoint**

**Description**: Backend endpoint to upload images to S3  
 **Files Created**:

* `backend/src/routes/media.routes.ts`  
* `backend/src/controllers/media.controller.ts`

**Files Modified**:

* `backend/src/services/s3.service.ts`

**Implementation Steps**:

* \[ \] POST `/api/v1/media/upload` endpoint  
* \[ \] Accept multipart/form-data image upload  
* \[ \] Validate file type and size  
* \[ \] Upload to S3 with unique filename  
* \[ \] Return public URL

---

#### **Task 15.3: Update MessageBubble for Images**

**Description**: Display images in chat bubbles  
 **Files Modified**:

* `mobile/components/chat/MessageBubble.tsx`

**Implementation Steps**:

* \[ \] Detect message type="image"  
* \[ \] Display image with Expo Image component  
* \[ \] Add loading state for image  
* \[ \] Make image tappable for fullscreen view  
* \[ \] Show image dimensions (max width/height)

---

#### **Task 15.4: Create Image Fullscreen View**

**Description**: Modal to view images fullscreen  
 **Files Created**:

* `mobile/components/chat/ImageViewer.tsx`

**Implementation Steps**:

* \[ \] Create modal overlay  
* \[ \] Display image at full size  
* \[ \] Add pinch-to-zoom gesture  
* \[ \] Add close button  
* \[ \] Support swiping to close

---

#### **Task 15.5: Update Socket Handler for Image Messages**

**Description**: Handle image messages via socket  
 **Files Modified**:

* `backend/src/socket/handlers/message.handler.ts`

**Implementation Steps**:

* \[ \] Accept mediaUrl in send\_message event  
* \[ \] Store message with type="image"  
* \[ \] Emit message\_received with image URL  
* \[ \] Handle same as text messages

---

#### **Task 15.6: Test Image Sending**

**Description**: Verify image upload and display works  
 **Your Actions**:

* \[ \] Send image from Device A  
* \[ \] Verify image uploads to S3  
* \[ \] Verify Device B receives image message  
* \[ \] Test image display in chat  
* \[ \] Test fullscreen image view

---

#### **Task 15.7: Commit and Create PR \#15**

**Git Actions**:

git add .

git commit \-m "feat: Add image upload and display in chat messages"

git push origin feature/image-upload

**Your Actions**:

* \[ \] Create PR \#15: "Image Upload & Display"  
* \[ \] Merge to main

---