# **Cloudflare Email Security \- User Submission Add-on for Gmail**

This Google Workspace Add-on provides a simple, configurable interface within Gmail for users and administrators to submit emails for reclassification to a Cloudflare Email Security account.

## **Features**

* **One-Click Submissions:** Allows users to reclassify an email with a single click directly from the Gmail sidebar.  
* **Configurable Classifications:** Administrators can define which submission categories are available.  
* **Role-Based Permissions:** Display different, more advanced submission options for security administrators or investigators.  
* **Undo Functionality:** Provides a 15-second "undo" window after a submission is made to prevent accidental clicks.  
* **Automated Post-Actions:** Automatically moves emails to Trash, Spam, or Inbox after a successful submission.  
* **Intelligent "Safe" Handling:** Automatically retrains both Cloudflare and Gmail filters when a message in the Spam folder is marked as safe.

## **Installation & Configuration**

Follow these steps to deploy and configure the add-on for your Google Workspace domain.

### **Step 1: Create the Apps Script Project**

1. Navigate to [Google Apps Script](https://script.google.com).  
2. Click **New project**. Give the project a name (e.g., "Cloudflare Email Submission").  
3. You will see a Code.gs file. Replace its contents with the code from the Code.gs file in this repository.  
4. In the editor settings (⚙️), check the box for **"Show 'appsscript.json' manifest file in editor"**.  
5. A new appsscript.json file will appear. Replace its contents with the code from the appsscript.json file in this repository.  
6. Click the **Save project** icon (💾).

### **Step 2: Enable the Admin SDK API**

The add-on needs permission to check a user's admin role to determine if they should see advanced options.

1. In the Apps Script editor, go to the **Services** section on the left sidebar (the \+ icon).  
2. Click **\+ Add a service**.  
3. From the list, find and select **Admin SDK API**.  
4. Click **Add**. This will enable the AdminDirectory object used in the code.

### **Step 3: Create a Custom Admin Role in Google Workspace**

This add-on uses a custom role to identify which users are "Admins" or "Investigators". This role does **not** need any permissions assigned to it; it is used only as a tag.

1. Go to your **Google Workspace Admin Console** (admin.google.com).  
2. Navigate to **Account \> Admin roles**.  
3. Click **Create new role**.  
4. Give it a name (e.g., Email Security Investigator) and a description.  
5. Click **Continue**.  
6. On the "Admin console privileges" page, **DO NOT** select any permissions.  
7. Click **Continue**, then click **Create Role**.  
8. After creating the role, assign it to your security administrators or investigators who need to see the "Team" submission options.

### **Step 4: Deploy the Add-on**

1. In the Apps Script editor, click the **Deploy** button \> **New deployment**.  
2. Click the gear icon next to "Select type" and choose **Add-on**.  
3. Provide a description for the deployment.  
4. Under **Installation**, choose **Admin install** for domain-wide deployment.  
5. Click **Deploy**.

The add-on will now be installed and available in the right-hand sidebar for all users in your domain.

### **Step 5: Configure the Add-on in Gmail**

The final configuration is done by an administrator directly within the Gmail interface.

1. Open Gmail and click the add-on icon in the right-hand sidebar.  
2. The "One-Click Forwarder Setup" card will appear.  
3. Enter your unique **Cloudflare Email Security Account ID**.  
4. From the dropdown list, select the **custom admin role** you created in Step 3\.  
5. Configure the **Visibility** and **Post-Action** for each of the six classifications to match your organization's policies.  
6. Click **Save Settings**.

The add-on is now fully configured and ready for users.

## **Usage for End-Users**

1. Open any email in Gmail.  
2. Click the add-on icon in the right-hand sidebar to open it.  
3. Select the desired classification from the list.  
4. Click the **"Submit Classification"** button.  
5. A confirmation will appear with a 15-second countdown and an **"Undo"** button, allowing the user to cancel the action if a mistake was made.
