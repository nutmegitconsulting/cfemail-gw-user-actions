// --- GLOBAL CONSTANTS ---
const SUBMISSION_DOMAIN = 'submission.cf-emailsecurity.com';
const UNDO_TIMEOUT_SECONDS = 15; // The countdown time shown to the user.
const TRIGGER_DELAY_SECONDS = 20; // The actual server-side delay. Must be >= UNDO_TIMEOUT_SECONDS.

const DEFAULT_CLASSIFICATIONS_CONFIG = [
  { name: 'malicious', permission: 'admin', postAction: 'trash', description: 'Email contains malicious software, links, or dangerous attachments.' },
  { name: 'spam',      permission: 'both',  postAction: 'spam',  description: 'Unsolicited commercial or promotional email (junk mail).' },
  { name: 'phishing',  permission: 'both',  postAction: 'trash', description: 'Email attempting to steal credentials or personal information.' },
  { name: 'spoof',     permission: 'admin', postAction: 'trash', description: 'Email impersonating a known sender or brand.' },
  { name: 'bulk',      permission: 'admin', postAction: 'trash', description: 'High-volume, non-critical email like newsletters or notifications.' },
  { name: 'safe',      permission: 'both',  postAction: 'inbox', description: 'Legitimate email that was incorrectly classified as a threat.' },
];

// Keys for storing settings in Script Properties.
const ACCOUNT_ID_KEY = 'email_security_account_id';
const ADMIN_ROLE_ID_KEY = 'email_security_admin_role_id';
const CLASSIFICATIONS_CONFIG_KEY = 'email_security_classifications_config';
// --- END CONSTANTS ---


/**
 * Renders the homepage card for the add-on, used for configuration.
 * @param {Object} e The event object.
 * @return {Card}
 */
function onHomepage(e) {
  return createSettingsCard('One-Click Forwarder Setup');
}

/**
 * The entry point for the add-on when a user opens an email.
 * @param {Object} e The event object containing context from Gmail.
 * @return {Card}
 */
function onGmailMessageOpen(e) {
  const accountId = PropertiesService.getScriptProperties().getProperty(ACCOUNT_ID_KEY);
  if (!accountId) {
    return createSettingsCard('SETUP REQUIRED');
  }

  if (!e.gmail.messageId) {
    return;
  }

  const messageId = e.gmail.messageId;
  const isAdmin = isUserAdmin();
  return createForwardingCard(messageId, isAdmin, accountId);
}

/**
 * Gets the current classification configuration from storage, or returns the default.
 * @return {Array<Object>}
 */
function getClassificationConfig() {
  const props = PropertiesService.getScriptProperties();
  const configString = props.getProperty(CLASSIFICATIONS_CONFIG_KEY);
  if (configString) {
    const storedConfig = JSON.parse(configString);
    return DEFAULT_CLASSIFICATIONS_CONFIG.map(defaultItem => {
      const storedItem = storedConfig.find(item => item.name === defaultItem.name);
      return storedItem ? { ...defaultItem, ...storedItem } : defaultItem;
    });
  }
  return DEFAULT_CLASSIFICATIONS_CONFIG;
}


/**
 * Creates the settings card for an admin to configure the add-on.
 */
function createSettingsCard(headerText) {
  const card = CardService.newCardBuilder().setHeader(CardService.newCardHeader().setTitle(headerText));
  const props = PropertiesService.getScriptProperties();

  // --- Section 1: Core Settings (Account ID and Role) ---
  const coreSection = CardService.newCardSection().setHeader('Core Settings');
  const currentId = props.getProperty(ACCOUNT_ID_KEY);
  coreSection.addWidget(CardService.newTextParagraph().setText(`<b>Step 1:</b> Enter your unique Email Security Account ID.`));
  coreSection.addWidget(CardService.newTextParagraph().setText(`<b>Current Account ID:</b> ${currentId ? currentId : '<i>Not Set</i>'}`));
  const accountIdInput = CardService.newTextInput().setFieldName('account_id_input').setTitle('Account ID').setValue(currentId || "");
  coreSection.addWidget(accountIdInput);

  coreSection.addWidget(CardService.newDivider());

  const currentRoleId = props.getProperty(ADMIN_ROLE_ID_KEY);
  let currentRoleName = '<i>Not Set</i>';
  if (currentRoleId) {
    try {
      const role = AdminDirectory.Roles.get(currentRoleId);
      currentRoleName = role.roleName;
    } catch (e) {
      console.error("Could not retrieve current role name for ID:", currentRoleId, e);
      currentRoleName = '<i>Error: Role not found.</i>';
    }
  }
  coreSection.addWidget(CardService.newTextParagraph().setText(`<b>Step 2:</b> Select the role for users who can see 'Team' buttons.`));
  coreSection.addWidget(CardService.newTextParagraph().setText(`<b>Current Admin Role:</b> ${currentRoleName}`));

  const rolesDropdown = CardService.newSelectionInput().setFieldName('admin_role_selection').setTitle('Select Admin Role').setType(CardService.SelectionInputType.DROPDOWN);
  try {
    const roles = AdminDirectory.Roles.list({ customer: 'my_customer' }).items || [];
    roles.forEach(role => {
      const isDefault = !currentRoleId && role.roleName === 'Help Desk Admin';
      const isSelected = role.roleId === currentRoleId || isDefault;
      rolesDropdown.addItem(role.roleName, role.roleId, isSelected);
    });
  } catch (e) {
    coreSection.addWidget(CardService.newTextParagraph().setText('<b>Error:</b> Could not load admin roles.'));
    console.error("Failed to list admin roles:", e);
  }
  coreSection.addWidget(rolesDropdown);
  card.addSection(coreSection);

  // --- Section 2: Classification Permissions & Actions ---
  const classSection = CardService.newCardSection().setHeader('Submission Classifications');
  classSection.addWidget(CardService.newTextParagraph().setText("Configure visibility and post-submission actions for each button."));
  const currentConfig = getClassificationConfig();

  currentConfig.forEach(item => {
    const title = item.name.charAt(0).toUpperCase() + item.name.slice(1);
    
    const permissionDropdown = CardService.newSelectionInput()
      .setFieldName(`class_${item.name}`)
      .setTitle(`${title} Visibility`)
      .setType(CardService.SelectionInputType.DROPDOWN)
      .addItem('User & Admin', 'both', item.permission === 'both')
      .addItem('Admin Only', 'admin', item.permission === 'admin')
      .addItem('User Only', 'user', item.permission === 'user')
      .addItem('Disabled', 'disabled', item.permission === 'disabled');
    classSection.addWidget(permissionDropdown);

    const actionDropdown = CardService.newSelectionInput()
      .setFieldName(`action_${item.name}`)
      .setTitle(`${title} Post-Action`)
      .setType(CardService.SelectionInputType.DROPDOWN)
      .addItem('Do Nothing', 'none', item.postAction === 'none' || !item.postAction)
      .addItem('Move to Trash', 'trash', item.postAction === 'trash')
      .addItem('Move to Spam', 'spam', item.postAction === 'spam')
      .addItem('Move to Inbox', 'inbox', item.postAction === 'inbox');
    classSection.addWidget(actionDropdown);
    classSection.addWidget(CardService.newDivider());
  });
  card.addSection(classSection);


  // --- Section 3: Save Button ---
  const buttonSection = CardService.newCardSection();
  const action = CardService.newAction().setFunctionName('saveSettingsCallback');
  const button = CardService.newTextButton().setText('Save Settings').setOnClickAction(action);
  buttonSection.addWidget(button);
  card.addSection(buttonSection);


  return card.build();
}

/**
 * Callback function to save all settings from the settings card.
 */
function saveSettingsCallback(e) {
  const form = e.formInput;
  const props = PropertiesService.getScriptProperties();

  const newAccountId = form.account_id_input;
  if (newAccountId && newAccountId.trim() !== '') {
    props.setProperty(ACCOUNT_ID_KEY, newAccountId.trim());
  }
  props.setProperty(ADMIN_ROLE_ID_KEY, form.admin_role_selection);

  const currentConfig = getClassificationConfig();
  const newConfig = currentConfig.map(item => {
    return {
      name: item.name,
      permission: form[`class_${item.name}`] || item.permission,
      postAction: form[`action_${item.name}`] || item.postAction,
      description: item.description 
    };
  });
  props.setProperty(CLASSIFICATIONS_CONFIG_KEY, JSON.stringify(newConfig));

  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText('Settings saved successfully.'))
    .setNavigation(CardService.newNavigation().updateCard(createSettingsCard('One-Click Forwarder Setup')))
    .build();
}


/**
 * Creates the main card with forwarding selection options.
 */
function createForwardingCard(messageId, isAdmin, accountId) {
  const cardBuilder = CardService.newCardBuilder();
  cardBuilder.addSection(createSelectionSection('User Reclassifications', 'user', 'user_selection'));
  if (isAdmin) {
    cardBuilder.addSection(createSelectionSection('Team Reclassifications', 'team', 'team_selection'));
  }
  
  const action = CardService.newAction()
    .setFunctionName('scheduleSubmissionCallback')
    .setParameters({ messageId: messageId, accountId: accountId });

  const submitButton = CardService.newTextButton()
    .setText('Submit Classification')
    .setOnClickAction(action);

  cardBuilder.addSection(CardService.newCardSection().addWidget(submitButton));
  return cardBuilder.build();
}

/**
 * Helper function to create a card section with a radio button selection for classifications.
 */
function createSelectionSection(header, type, fieldName) {
  const section = CardService.newCardSection().setHeader(header);
  const config = getClassificationConfig();
  
  let visibleClassifications = [];
  if (type === 'user') {
    visibleClassifications = config.filter(c => c.permission === 'both' || c.permission === 'user');
  } else {
    visibleClassifications = config.filter(c => c.permission === 'both' || c.permission === 'admin');
  }
  
  if (visibleClassifications.length === 0) {
      section.addWidget(CardService.newTextParagraph().setText("<i>No classifications enabled for this view.</i>"));
      return section;
  }

  const selectionGroup = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.RADIO_BUTTON)
    .setFieldName(fieldName);

  visibleClassifications.forEach(classification => {
    selectionGroup.addItem(
      `${classification.name.charAt(0).toUpperCase() + classification.name.slice(1)} - <i>${classification.description}</i>`,
      classification.name,
      false
    );
  });
  
  section.addWidget(selectionGroup);
  return section;
}


/**
 * Checks if the current user has the designated admin role.
 */
function isUserAdmin() {
  const adminRoleId = PropertiesService.getScriptProperties().getProperty(ADMIN_ROLE_ID_KEY);
  if (!adminRoleId) return false;
  const userEmail = Session.getActiveUser().getEmail();
  try {
    const roleAssignments = AdminDirectory.RoleAssignments.list({ userKey: userEmail }).items || [];
    return roleAssignments.some(assignment => assignment.roleId === adminRoleId);
  } catch (e) {
    console.error(`Could not check admin role for ${userEmail}. Error: ${e.toString()}`);
    return false;
  }
}

/**
 * Called when the user clicks "Submit Classification".
 * It creates a trigger to run the actual submission after a delay.
 */
function scheduleSubmissionCallback(e) {
  const params = e.parameters;
  const form = e.formInput;

  const selectedLabel = form.user_selection || form.team_selection;
  const selectedType = form.user_selection ? 'user' : 'team';
  
  if (!selectedLabel) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText("Please select a classification first.").setType(CardService.NotificationType.ERROR))
      .build();
  }

  const submissionParams = {
    messageId: params.messageId,
    label: selectedLabel,
    destinationEmail: `${params.accountId}+${selectedType}+${selectedLabel}@${SUBMISSION_DOMAIN}`,
  };

  const trigger = ScriptApp.newTrigger('executeSubmissionCallback')
    .timeBased()
    .after(TRIGGER_DELAY_SECONDS * 1000)
    .create();
  
  const triggerId = trigger.getUniqueId();
  PropertiesService.getUserProperties().setProperty(triggerId, JSON.stringify(submissionParams));

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(createUndoCard(triggerId, selectedLabel)))
    .build();
}

/**
 * Creates the card that shows the countdown and the Undo button.
 */
function createUndoCard(triggerId, label) {
  const card = CardService.newCardBuilder();
  const section = CardService.newCardSection();
  section.addWidget(CardService.newTextParagraph().setText(`Submission for "<b>${label}</b>" is scheduled.`));
  section.addWidget(CardService.newTextParagraph().setText(`The action will be completed in ${UNDO_TIMEOUT_SECONDS} seconds.`));

  const undoAction = CardService.newAction()
    .setFunctionName('cancelSubmissionCallback')
    .setParameters({ triggerId: triggerId });
  const undoButton = CardService.newTextButton()
    .setText('Undo')
    .setOnClickAction(undoAction);
  section.addWidget(undoButton);
  
  card.addSection(section);
  return card.build();
}

/**
 * Called by the time-based trigger to perform the actual submission.
 */
function executeSubmissionCallback(e) {
  const triggerId = e.triggerUid;
  const userProps = PropertiesService.getUserProperties();
  const paramsJson = userProps.getProperty(triggerId);

  userProps.deleteProperty(triggerId);
  deleteTriggerById(triggerId);

  if (!paramsJson) {
    console.error("Could not find parameters for trigger ID:", triggerId);
    return;
  }
  
  const params = JSON.parse(paramsJson);
  forwardEmailCallback({ parameters: params });
}

/**
 * Called when the user clicks the "Undo" button. Deletes the trigger.
 */
function cancelSubmissionCallback(e) {
  const triggerId = e.parameters.triggerId;
  
  deleteTriggerById(triggerId);
  PropertiesService.getUserProperties().deleteProperty(triggerId);

  const card = CardService.newCardBuilder()
    .addSection(CardService.newCardSection().addWidget(CardService.newTextParagraph().setText("Submission canceled.")))
    .build();

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(card))
    .build();
}

/**
 * Helper function to find and delete a trigger by its unique ID.
 */
function deleteTriggerById(triggerId) {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getUniqueId() === triggerId) {
      ScriptApp.deleteTrigger(triggers[i]);
      break;
    }
  }
}


/**
 * The core logic function that performs the forwarding and moving.
 * Now it is called by the trigger, not directly by a button click.
 */
function forwardEmailCallback(e) {
  const params = e.parameters;
  const destinationEmail = params.destinationEmail;
  const messageId = params.messageId;
  const label = params.label;
  
  try {
    const message = GmailApp.getMessageById(messageId);
    
    // SPECIAL LOGIC FOR "SAFE" BUTTON ON A SPAM MESSAGE
    if (label === 'safe' && message.isInSpam()) {
      const subject = message.getSubject();
      const rawContent = message.getRawContent();
      
      GmailApp.sendEmail(destinationEmail, `Forwarded Submission: ${subject}`, `Email reclassified...`, { attachments: [{ fileName: `${subject}.eml`, mimeType: 'message/rfc822', content: rawContent }], name: 'One-Click Forwarder' });
      message.moveToInbox();
      console.log(`Successfully processed 'safe' submission for message ${messageId}`);
      return;
    }

    // STANDARD LOGIC FOR ALL OTHER CASES
    const config = getClassificationConfig();
    const classificationConfig = config.find(c => c.name === label);
    const postAction = classificationConfig ? classificationConfig.postAction : 'none';
    const subject = message.getSubject();
    const rawContent = message.getRawContent();
    
    GmailApp.sendEmail(destinationEmail, `Forwarded Submission: ${subject}`, `Email reclassified...`, { attachments: [{ fileName: `${subject}.eml`, mimeType: 'message/rfc822', content: rawContent }], name: 'One-Click Forwarder' });

    switch (postAction) {
      case 'trash': message.moveToTrash(); break;
      case 'spam': message.moveToSpam(); break;
      case 'inbox': message.moveToInbox(); break;
    }

    console.log(`Successfully processed '${label}' submission for message ${messageId}`);

  } catch (error) {
    console.error(`Error processing submission for message ${messageId}:`, error.toString());
  }
}

