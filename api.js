// API Configuration
const API_BASE_URL = 'https://128.140.37.194:5000';

// Generate Letter API
async function generateLetter(formData) {
    const loader = document.getElementById('loader');
    loader.classList.add('active');
    
    try {
        // Determine the recipient_title to send
        let finalRecipientTitle = formData.get('recipient_title');
        const otherRecipientTitle = formData.get('other_recipient_title');

        if (finalRecipientTitle === 'أخرى' && otherRecipientTitle) {
            finalRecipientTitle = otherRecipientTitle;
        }

        // Prepare the payload
        const payload = {
            type: formData.get('type'),
            category: formData.get('category'), // Now a text field
            recipient: formData.get("recipient").trim() === "" ? "لا يوجد" : formData.get("recipient"),
            isFirst: formData.get('isFirst') === 'true',
            prompt: formData.get('prompt'),
            organization_name: formData.get('organization_name'), // New field
            recipient_job_title: formData.get('recipient_job_title'), // New field
            recipient_title: finalRecipientTitle, // Updated logic for recipient_title
        };

        // Only include member_name if a value is selected
        const memberName = formData.get('member_name');
        if (memberName && memberName.trim() !== '') {
            payload.member_name = memberName;
        }

        // Handle previous letter content for follow-up letters
        const previousLetterId = formData.get('previous_letter_id');
        if (previousLetterId && previousLetterId.trim() !== '') {
            const previousLetterSelect = document.getElementById('previousLetter');
            const selectedOption = previousLetterSelect.querySelector(`option[value="${previousLetterId}"]`);
            if (selectedOption && selectedOption.dataset.content) {
                payload.previous_letter_content = selectedOption.dataset.content;
                payload.previous_letter_id = previousLetterId;
            }
        }

        // Handle received letter content for reply letters
        const receivedLetterId = formData.get('received_letter_id');
        if (receivedLetterId && receivedLetterId.trim() !== '') {
            const receivedLetterSelect = document.getElementById('receivedLetter');
            const selectedOption = receivedLetterSelect.querySelector(`option[value="${receivedLetterId}"]`);
            if (selectedOption && selectedOption.dataset.content) {
                payload.previous_letter_content = selectedOption.dataset.content;
                // Note: Using same key 'previous_letter_content' for both previous and received letters
            }
        }
        
        // Since we can't directly call HTTPS with self-signed cert from browser,
        // we'll use a proxy endpoint
        const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                endpoint: 'generate-letter',
                data: payload
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate letter');
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('Error generating letter:', error);
        alert('حدث خطأ أثناء إنشاء الخطاب. الرجاء المحاولة مرة أخرى.');
        return null;
    } finally {
        loader.classList.remove('active');
    }
}

// Archive Letter API
async function archiveLetter(formData) {
    try {
        // Convert FormData to a plain JS object
        const payload = {};
        for (let [key, value] of formData.entries()) {
            payload[key] = value;
        }

        const requestBody = {
            endpoint: 'archive-letter',
            data: payload
        };

        console.log('Sending archive request:', requestBody); // Debug log

        const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status); // Debug log
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Archive response error:', errorText);
            throw new Error(`Failed to archive letter: ${response.status}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error('Error archiving letter:', error);
        alert('حدث خطأ أثناء حفء المحاولة مرة أخرى.');
        return null;
    }
}

// Form submission handler
if (document.getElementById('letterForm')) {
    document.getElementById('letterForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        

        // Validate recipient name before proceeding
        const recipientInput = document.getElementById("recipient");
        const recipientValue = recipientInput.value.trim();

        // Count the number of words
        if (recipientValue.length > 0 && recipientValue.split(" ").length < 2) {
            alert("يرجى إدخال الاسم الأول والثاني للمرسل إليه.");
            recipientInput.focus();
            return; // Stop execution here
        }
        
        const formData = new FormData(e.target);
        const result = await generateLetter(formData);
        
        if (result) {
            // Display the generated letter in both formats
            document.getElementById('letterPreview').value = result.Letter || 'محتوى الخطاب المُنشأ سيظهر هنا...';
            
            // Populate the document template
            if (typeof populateDocumentTemplate === 'function') {
                populateDocumentTemplate(result, formData);
            }
            
            document.getElementById('previewSection').style.display = 'block';
            
            // Store the generated letter data
            window.generatedLetterData = result;
        }
    });
}

// Save button handler
if (document.getElementById('saveButton')) {
    document.getElementById('saveButton').addEventListener('click', async () => {
        const letterContent = document.getElementById('letterPreview').value;
        const selectedTemplate = document.querySelector('input[name="template"]:checked').value;
        
        // Generate PDF from letter content
        
        
        // Prepare archive data as FormData
        const formData = new FormData();
        
        formData.append('letter_content', letterContent);
        formData.append('letter_type', document.getElementById('letterType').value);
        formData.append('recipient', document.getElementById('recipient').value);
        formData.append('template', 'default_template.html');
        // Use the title from the generated letter data
        if (window.generatedLetterData && window.generatedLetterData.Title) {
            formData.append('title', window.generatedLetterData.Title);
        } else {
            // Fallback if title is not available from generated data
            formData.append('title', 'Untitled Letter'); 
        }

        formData.append('is_first', document.querySelector('input[name="isFirst"]:checked').value);
        
        // Use the ID from the generated letter data
        if (window.generatedLetterData && window.generatedLetterData.ID) {
            formData.append('ID', window.generatedLetterData.ID);
         } else {
            // Fallback if ID is not available from generated data
            formData.append("ID", generateUniqueId()); 
        }

        // Add username to the payload
        const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
        if (loggedInUser && loggedInUser.username) {
            formData.append("username", loggedInUser.username);
        }
        const result = await archiveLetter(formData);
        
        if (result) {
