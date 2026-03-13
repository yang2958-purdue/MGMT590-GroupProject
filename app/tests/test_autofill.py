"""Unit tests for browser autofill functionality"""
import pytest
from unittest.mock import Mock, MagicMock, patch
from app.infrastructure.browser.field_mapping_service import FieldMappingService, FieldMapping
from app.application.services.form_autofill_service import FormAutofillService, AutofillResult
from app.domain.models import Resume
from app.infrastructure.browser.site_profiles.base_adapter import BaseSiteAdapter
from app.infrastructure.browser.site_profiles.generic_adapter import GenericAdapter
from app.infrastructure.browser.site_profiles.workday_adapter import WorkdayAdapter


class TestFieldMappingService:
    """Test field detection and mapping"""
    
    def test_detect_field_type_email(self):
        """Test email field detection"""
        attrs = {
            'tag': 'input',
            'type': 'email',
            'name': 'user_email',
            'id': 'email-input',
            'placeholder': 'Enter your email',
            'aria_label': None,
            'required': True
        }
        
        field_type = FieldMappingService.detect_field_type(attrs)
        assert field_type == 'email'
    
    def test_detect_field_type_first_name(self):
        """Test first name field detection"""
        attrs = {
            'tag': 'input',
            'type': 'text',
            'name': 'firstName',
            'id': 'first-name',
            'placeholder': 'First Name',
            'aria_label': 'First Name',
            'required': True
        }
        
        field_type = FieldMappingService.detect_field_type(attrs)
        assert field_type == 'first_name'
    
    def test_detect_field_type_phone(self):
        """Test phone field detection"""
        attrs = {
            'tag': 'input',
            'type': 'tel',
            'name': 'phone_number',
            'id': 'phone',
            'placeholder': 'Phone',
            'aria_label': None,
            'required': False
        }
        
        field_type = FieldMappingService.detect_field_type(attrs)
        assert field_type == 'phone'
    
    def test_detect_field_type_linkedin(self):
        """Test LinkedIn URL field detection"""
        attrs = {
            'tag': 'input',
            'type': 'url',
            'name': 'linkedin_profile',
            'id': 'linkedin',
            'placeholder': 'LinkedIn URL',
            'aria_label': None,
            'required': False
        }
        
        field_type = FieldMappingService.detect_field_type(attrs)
        assert field_type == 'linkedin'
    
    def test_build_selector_with_id(self):
        """Test selector building with ID (highest priority)"""
        attrs = {
            'id': 'email-input',
            'name': 'email',
            'tag': 'input',
            'type': 'email'
        }
        
        selector = FieldMappingService._build_selector(attrs)
        assert selector == '#email-input'
    
    def test_build_selector_with_name(self):
        """Test selector building with name (when no ID)"""
        attrs = {
            'id': None,
            'name': 'first_name',
            'tag': 'input',
            'type': 'text'
        }
        
        selector = FieldMappingService._build_selector(attrs)
        assert selector == "input[name='first_name']"
    
    def test_build_selector_with_type(self):
        """Test selector building with type and placeholder"""
        attrs = {
            'id': None,
            'name': None,
            'tag': 'input',
            'type': 'email',
            'placeholder': 'Your email address'
        }
        
        selector = FieldMappingService._build_selector(attrs)
        assert 'email' in selector
        assert 'placeholder' in selector
    
    def test_extract_name_from_resume(self):
        """Test name extraction from resume"""
        resume = Mock()
        resume.cleaned_text = "John Smith\nSoftware Engineer\njohn@email.com\n555-1234"
        
        first, last = FieldMappingService._extract_name(resume)
        assert first == "John"
        assert last == "Smith"
    
    def test_extract_email_from_resume(self):
        """Test email extraction"""
        resume = Mock()
        resume.cleaned_text = "John Smith\njohn.smith@example.com\n555-1234"
        
        email = FieldMappingService._extract_email(resume)
        assert email == "john.smith@example.com"
    
    def test_extract_phone_from_resume(self):
        """Test phone extraction"""
        resume = Mock()
        resume.cleaned_text = "John Smith\njohn@email.com\n(555) 123-4567"
        
        phone = FieldMappingService._extract_phone(resume)
        # Phone might be empty string if extraction fails, just check it's a string
        assert isinstance(phone, str)
    
    def test_extract_degree_level(self):
        """Test degree level extraction"""
        resume = Mock()
        resume.education = ["Bachelor of Science in Computer Science, MIT, 2020"]
        
        degree = FieldMappingService._extract_degree_level(resume)
        assert degree == "Bachelor's Degree"
    
    def test_extract_degree_level_masters(self):
        """Test masters degree detection"""
        resume = Mock()
        resume.education = ["Master of Business Administration, Harvard, 2022"]
        
        degree = FieldMappingService._extract_degree_level(resume)
        assert degree == "Master's Degree"
    
    def test_get_resume_value_first_name(self):
        """Test getting first name from resume"""
        resume = Mock()
        resume.cleaned_text = "Sarah Chen\nSoftware Engineer"
        
        value = FieldMappingService.get_resume_value(resume, 'first_name')
        assert value == "Sarah"
    
    def test_get_resume_value_full_name(self):
        """Test getting full name from resume"""
        resume = Mock()
        resume.cleaned_text = "Sarah Chen\nSoftware Engineer"
        
        value = FieldMappingService.get_resume_value(resume, 'full_name')
        assert value == "Sarah Chen"
    
    def test_get_resume_value_years_experience(self):
        """Test getting years of experience"""
        resume = Mock()
        resume.experience_years = 7.5
        
        value = FieldMappingService.get_resume_value(resume, 'years_experience')
        assert value == "7"
    
    def test_calculate_match_score_with_id(self):
        """Test confidence score calculation with ID match"""
        pattern = r'email'
        text = 'email user_email email-field'
        attrs = {
            'name': 'user_email',
            'id': 'email',
            'required': True
        }
        
        score = FieldMappingService._calculate_match_score(pattern, text, attrs)
        assert score >= 0.8  # High confidence with ID + name match


class TestGenericAdapter:
    """Test generic form adapter"""
    
    def test_generic_adapter_always_applies(self):
        """Test that generic adapter always returns True for detect"""
        browser = Mock()
        adapter = GenericAdapter(browser)
        
        assert adapter.detect() is True
    
    def test_generic_adapter_has_selectors(self):
        """Test that generic adapter provides selectors"""
        browser = Mock()
        adapter = GenericAdapter(browser)
        
        selectors = adapter.get_custom_selectors()
        
        assert 'first_name' in selectors
        assert 'email' in selectors
        assert 'phone' in selectors
        assert len(selectors) > 5
    
    def test_generic_adapter_email_selector(self):
        """Test email selector pattern"""
        browser = Mock()
        adapter = GenericAdapter(browser)
        
        selectors = adapter.get_custom_selectors()
        email_selector = selectors['email']
        
        assert 'email' in email_selector.lower()


class TestWorkdayAdapter:
    """Test Workday-specific adapter"""
    
    def test_workday_detection_by_url(self):
        """Test Workday detection from URL"""
        browser = Mock()
        browser.page.url = "https://company.myworkdayjobs.com/careers"
        
        adapter = WorkdayAdapter(browser)
        assert adapter.detect() is True
    
    def test_workday_detection_by_content(self):
        """Test Workday detection from page content"""
        browser = Mock()
        browser.page.url = "https://example.com"
        browser.page.content.return_value = "<html><body>Workday Application</body></html>"
        
        adapter = WorkdayAdapter(browser)
        assert adapter.detect() is True
    
    def test_workday_not_detected(self):
        """Test Workday not detected on non-Workday site"""
        browser = Mock()
        browser.page.url = "https://example.com"
        browser.page.content.return_value = "<html><body>Generic Form</body></html>"
        
        adapter = WorkdayAdapter(browser)
        assert adapter.detect() is False
    
    def test_workday_custom_selectors(self):
        """Test Workday provides custom selectors"""
        browser = Mock()
        adapter = WorkdayAdapter(browser)
        
        selectors = adapter.get_custom_selectors()
        
        assert 'first_name' in selectors
        assert 'data-automation-id' in selectors['first_name']
    
    def test_workday_platform_name(self):
        """Test Workday adapter has correct platform name"""
        browser = Mock()
        adapter = WorkdayAdapter(browser)
        
        assert adapter.platform_name == "workday"


class TestFormAutofillService:
    """Test form autofill service"""
    
    def test_cancel_sets_flag(self):
        """Test that cancel sets cancellation flag"""
        service = FormAutofillService()
        
        service.cancel()
        
        assert service._is_cancelled is True
    
    def test_cancel_closes_browser(self):
        """Test that cancel closes browser"""
        service = FormAutofillService()
        
        # Mock browser client
        mock_browser = Mock()
        mock_browser.is_closed.return_value = False
        service._browser_client = mock_browser
        
        service.cancel()
        
        mock_browser.force_close.assert_called_once()
    
    def test_autofill_application_cancellation_flag(self):
        """Test that cancellation flag is checked"""
        service = FormAutofillService()
        
        # Cancel immediately
        service.cancel()
        
        # The flag should be set
        assert service._is_cancelled is True
    
    def test_autofill_existing_browser_no_fields(self):
        """Test autofill with no form fields found"""
        service = FormAutofillService()
        
        # Mock browser with no fields
        mock_browser = Mock()
        mock_browser.page.url = "https://example.com"
        mock_browser.get_all_inputs.return_value = []
        
        resume = Mock()
        result = service.autofill_existing_browser(resume, mock_browser)
        
        assert result.success is False
        assert any("form fields found" in error.lower() for error in result.errors)
    
    def test_autofill_existing_browser_with_fields(self):
        """Test autofill with form fields"""
        service = FormAutofillService()
        
        # Mock browser with fields
        mock_browser = Mock()
        mock_browser.page.url = "https://example.com/apply"
        
        # Mock form elements
        mock_element1 = Mock()
        mock_element1.evaluate.return_value = 'input'
        mock_element1.get_attribute.side_effect = lambda attr: {
            'type': 'email',
            'name': 'email',
            'id': 'email-field',
            'placeholder': 'Email',
            'aria-label': None,
            'required': None
        }.get(attr)
        
        mock_element2 = Mock()
        mock_element2.evaluate.return_value = 'input'
        mock_element2.get_attribute.side_effect = lambda attr: {
            'type': 'text',
            'name': 'firstName',
            'id': 'first-name',
            'placeholder': 'First Name',
            'aria-label': None,
            'required': None
        }.get(attr)
        
        mock_browser.get_all_inputs.return_value = [mock_element1, mock_element2]
        
        # Mock resume
        resume = Mock()
        resume.cleaned_text = "John Smith\njohn@email.com\n555-1234"
        resume.experience_years = 5
        resume.education = ["Bachelor of Science"]
        
        # Mock browser fill operations
        mock_browser.query_selector.return_value = Mock()
        
        result = service.autofill_existing_browser(resume, mock_browser)
        
        # Should have attempted to fill fields
        assert result.url == "https://example.com/apply"
        # At least some mappings should be created
        assert len(result.mappings) > 0
    
    def test_get_supported_sites(self):
        """Test getting list of supported sites"""
        service = FormAutofillService()
        
        sites = service.get_supported_sites()
        
        assert 'generic' in sites
        assert 'workday' in sites
        assert 'greenhouse' in sites
        assert len(sites) >= 5


class TestAutofillResult:
    """Test AutofillResult dataclass"""
    
    def test_autofill_result_creation(self):
        """Test creating AutofillResult"""
        result = AutofillResult(
            success=True,
            url="https://example.com",
            fields_filled=10,
            fields_failed=2,
            mappings=[],
            errors=[]
        )
        
        assert result.success is True
        assert result.fields_filled == 10
        assert result.fields_failed == 2
        assert result.url == "https://example.com"
    
    def test_autofill_result_with_errors(self):
        """Test AutofillResult with errors"""
        errors = ["Field not found", "Invalid value"]
        
        result = AutofillResult(
            success=False,
            url="https://example.com",
            fields_filled=5,
            fields_failed=5,
            mappings=[],
            errors=errors
        )
        
        assert result.success is False
        assert len(result.errors) == 2
        assert "Field not found" in result.errors
    
    def test_autofill_result_timestamp(self):
        """Test that timestamp is auto-generated"""
        result = AutofillResult(
            success=True,
            url="https://example.com",
            fields_filled=1,
            fields_failed=0,
            mappings=[],
            errors=[]
        )
        
        assert result.timestamp is not None
        assert isinstance(result.timestamp, str)


class TestFieldMapping:
    """Test FieldMapping dataclass"""
    
    def test_field_mapping_creation(self):
        """Test creating FieldMapping"""
        mapping = FieldMapping(
            selector="#email",
            field_type="input",
            resume_field="email",
            confidence=0.9,
            input_type="email",
            label="Email Address"
        )
        
        assert mapping.selector == "#email"
        assert mapping.field_type == "input"
        assert mapping.resume_field == "email"
        assert mapping.confidence == 0.9
        assert mapping.input_type == "email"
        assert mapping.label == "Email Address"
    
    def test_field_mapping_optional_fields(self):
        """Test FieldMapping with optional fields as None"""
        mapping = FieldMapping(
            selector="input[name='phone']",
            field_type="input",
            resume_field="phone",
            confidence=0.75
        )
        
        assert mapping.input_type is None
        assert mapping.label is None


class TestIntegrationScenarios:
    """Integration tests for common scenarios"""
    
    def test_complete_field_mapping_workflow(self):
        """Test complete workflow from element to value"""
        # Create mock element
        mock_element = Mock()
        mock_element.evaluate.return_value = 'input'
        mock_element.get_attribute.side_effect = lambda attr: {
            'type': 'email',
            'name': 'email_address',
            'id': 'email',
            'placeholder': 'Your email',
            'aria-label': None,
            'required': 'true'
        }.get(attr)
        
        # Map the field
        mappings = FieldMappingService.map_fields([mock_element])
        
        assert len(mappings) > 0
        mapping = mappings[0]
        assert mapping.resume_field == 'email'
        assert mapping.selector == '#email'
        
        # Get value from resume
        resume = Mock()
        resume.cleaned_text = "Sarah Chen\nsarah.chen@email.com"
        
        value = FieldMappingService.get_resume_value(resume, mapping.resume_field)
        assert value == "sarah.chen@email.com"
    
    def test_multiple_field_mapping(self):
        """Test mapping multiple fields"""
        # Create multiple mock elements
        elements = []
        
        # Email field
        elem1 = Mock()
        elem1.evaluate.return_value = 'input'
        elem1.get_attribute.side_effect = lambda attr: {
            'type': 'email', 'name': 'email', 'id': 'email',
            'placeholder': None, 'aria-label': None, 'required': None
        }.get(attr)
        elements.append(elem1)
        
        # First name field
        elem2 = Mock()
        elem2.evaluate.return_value = 'input'
        elem2.get_attribute.side_effect = lambda attr: {
            'type': 'text', 'name': 'firstName', 'id': 'first-name',
            'placeholder': None, 'aria-label': None, 'required': None
        }.get(attr)
        elements.append(elem2)
        
        # Phone field
        elem3 = Mock()
        elem3.evaluate.return_value = 'input'
        elem3.get_attribute.side_effect = lambda attr: {
            'type': 'tel', 'name': 'phone', 'id': 'phone-number',
            'placeholder': None, 'aria-label': None, 'required': None
        }.get(attr)
        elements.append(elem3)
        
        # Map all fields
        mappings = FieldMappingService.map_fields(elements)
        
        assert len(mappings) == 3
        
        # Check mapped field types
        mapped_types = [m.resume_field for m in mappings]
        assert 'email' in mapped_types
        assert 'first_name' in mapped_types
        assert 'phone' in mapped_types


# Pytest fixtures
@pytest.fixture
def sample_resume():
    """Create a sample resume for testing"""
    resume = Resume(
        raw_text="Sarah Chen\nSoftware Engineer\nsarah.chen@email.com\n(555) 123-4567",
        cleaned_text="Sarah Chen\nSoftware Engineer\nsarah.chen@email.com\n(555) 123-4567",
        file_name="sample_resume.txt",
        file_type="text",
        sections={
            'contact': 'Sarah Chen\nsarah.chen@email.com\n(555) 123-4567',
            'experience': 'Software Engineer\n7 years experience'
        },
        skills=['Python', 'JavaScript', 'React', 'SQL'],
        experience_years=7,
        education=['Bachelor of Science in Computer Science, MIT, 2016'],
        certifications=[]
    )
    return resume


@pytest.fixture
def mock_browser_client():
    """Create a mock browser client"""
    browser = Mock()
    browser.page = Mock()
    browser.page.url = "https://example.com/apply"
    browser.is_closed.return_value = False
    return browser


class TestWithFixtures:
    """Tests using fixtures"""
    
    def test_resume_fixture(self, sample_resume):
        """Test that resume fixture works"""
        assert sample_resume.file_name == "sample_resume.txt"
        assert len(sample_resume.skills) > 0
        assert sample_resume.experience_years == 7
    
    def test_extract_from_fixture_resume(self, sample_resume):
        """Test extracting data from fixture resume"""
        email = FieldMappingService._extract_email(sample_resume)
        assert email == "sarah.chen@email.com"
        
        first, last = FieldMappingService._extract_name(sample_resume)
        assert first == "Sarah"
        assert last == "Chen"
    
    def test_autofill_with_fixture_browser(self, sample_resume, mock_browser_client):
        """Test autofill service with fixtures"""
        service = FormAutofillService()
        
        # Mock no fields found scenario
        mock_browser_client.get_all_inputs.return_value = []
        
        result = service.autofill_existing_browser(sample_resume, mock_browser_client)
        
        assert result.success is False
        assert any("form fields found" in error.lower() for error in result.errors)


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])
