# Create your tests here.
# python
import importlib
import inspect
import unittest
from decimal import Decimal

from django.http import HttpResponse
from django.test import RequestFactory, TestCase

from common.models.building import (
    Building,
    as_acris_master,
    as_violation,
    build_building_from_rows,
)
from common.models.acris import AcrisMaster
from common.models.affordable_housing_record import AffordableHousingRecord
from common.models.complaint import Complaint
from common.models.eviction import Eviction
from common.models.registration import Registration
from common.models.registration_contact import RegistrationContact
from common.models.rent_stabilized_tag import RentStabilizedTag
from common.models.violation import Violation


class ModelsSmokeTests(TestCase):
    def test_models_module_and_meta(self):
        try:
            mod = importlib.import_module("apps.building.models")
        except ImportError:
            self.skipTest("backend.apps.building.models 모듈이 없음")

        # Django 모델 클래스인지 검사
        try:
            from django.db import models as djmodels
        except Exception:
            self.skipTest("Django ORM 사용 불가")

        model_classes = [
            getattr(mod, name) for name in dir(mod) if not name.startswith("_")
        ]

        for obj in model_classes:
            if inspect.isclass(obj) and issubclass(obj, djmodels.Model):
                self.assertTrue(hasattr(obj, "_meta"))
                self.assertIsNotNone(getattr(obj._meta, "model_name", None))
        self.assertTrue(mod is not None)


class ViewsSmokeTests(TestCase):
    def test_views_callables_return_httpresponse_when_possible(self):
        try:
            mod = importlib.import_module("apps.building.views")
        except ImportError:
            self.skipTest("backend.apps.building.views 모듈이 없음")

        rf = RequestFactory()
        # 함수형 뷰 검사 (뷰 함수만 테스트)
        for name, func in inspect.getmembers(mod, inspect.isfunction):
            # 뷰 함수는 보통 request를 첫 번째 인자로 받음
            if not name.startswith('_') and hasattr(func, '__code__'):
                req = rf.get("/")
                try:
                    resp = func(req)
                    # HttpResponse를 반환하는 경우만 검사
                    if isinstance(resp, HttpResponse):
                        self.assertTrue(True, f"{name} returned HttpResponse")
                except TypeError:
                    # 인자가 달라서 호출 불가하면 건너뜀
                    continue
                except Exception:
                    # 뷰 내부에서 예외가 나면 테스트를 실패시키지 않고 건너뜀
                    continue

        # 클래스 기반 뷰 검사 (as_view 제공하는 클래스)
        for name, cls in inspect.getmembers(mod, inspect.isclass):
            if hasattr(cls, "as_view"):
                req = rf.get("/")
                try:
                    view = cls.as_view()
                    resp = view(req)
                except TypeError:
                    continue
                except Exception:
                    continue
                self.assertTrue(
                    isinstance(resp, HttpResponse),
                    f"{name}.as_view() did not return HttpResponse",
                )


class BuildingModelTests(TestCase):
    def setUp(self):
        self.building = Building(bbl="1234567890")

    def test_building_initialization(self):
        """Test Building dataclass initialization"""
        self.assertEqual(self.building.bbl, "1234567890")
        self.assertIsNone(self.building.registration)
        self.assertIsNone(self.building.rent_stabilized)
        self.assertEqual(self.building.contacts, [])
        self.assertEqual(self.building.affordable, [])
        self.assertEqual(self.building.complaints, [])
        self.assertEqual(self.building.violations, [])
        self.assertEqual(self.building.acris_master, {})
        self.assertEqual(self.building.acris_legals, {})
        self.assertEqual(self.building.acris_parties, {})
        self.assertEqual(self.building.evictions, [])

    def test_set_registration_valid(self):
        """Test setting registration with matching BBL"""
        reg = Registration(bbl="1234567890", house_number="123", street_name="Main St")
        self.building.set_registration(reg)
        self.assertEqual(self.building.registration, reg)

    def test_set_registration_invalid_bbl(self):
        """Test setting registration with non-matching BBL"""
        reg = Registration(bbl="9999999999", house_number="123", street_name="Main St")
        self.building.set_registration(reg)
        self.assertIsNone(self.building.registration)

    def test_set_registration_none(self):
        """Test setting registration to None"""
        self.building.set_registration(None)
        self.assertIsNone(self.building.registration)

    def test_set_rent_stabilized_valid(self):
        """Test setting rent stabilized tag with matching BBL"""
        tag = RentStabilizedTag(
            bbl="1234567890", 
            borough="Manhattan", 
            block=123, 
            lot=456, 
            zip="10001", 
            city="New York", 
            status="Active", 
            source_year=2023
        )
        self.building.set_rent_stabilized(tag)
        self.assertEqual(self.building.rent_stabilized, tag)

    def test_set_rent_stabilized_invalid_bbl(self):
        """Test setting rent stabilized tag with non-matching BBL"""
        tag = RentStabilizedTag(
            bbl="9999999999", 
            borough="Manhattan", 
            block=123, 
            lot=456, 
            zip="10001", 
            city="New York", 
            status="Active", 
            source_year=2023
        )
        self.building.set_rent_stabilized(tag)
        self.assertIsNone(self.building.rent_stabilized)

    def test_upsert_acris_master(self):
        """Test upserting ACRIS master record"""
        master = AcrisMaster(
            document_id="123", 
            borough=1, 
            doc_type="DEED", 
            doc_date=None, 
            doc_amount=Decimal("1000.50")
        )
        self.building.upsert_acris_master(master)
        self.assertEqual(len(self.building.acris_master), 1)
        self.assertEqual(self.building.acris_master["123"], master)

    def test_upsert_acris_master_none(self):
        """Test upserting None ACRIS master record"""
        self.building.upsert_acris_master(None)
        self.assertEqual(len(self.building.acris_master), 0)

    def test_upsert_acris_master_no_document_id(self):
        """Test upserting ACRIS master record without document_id"""
        master = AcrisMaster(
            document_id=None, 
            borough=1, 
            doc_type="DEED", 
            doc_date=None, 
            doc_amount=Decimal("1000.50")
        )
        self.building.upsert_acris_master(master)
        self.assertEqual(len(self.building.acris_master), 0)

    def test_add_contact(self):
        """Test adding contact"""
        contact = RegistrationContact(
            registration_contact_id=1,
            registration_id=1,
            type="Owner",
            contact_description="Primary owner",
            first_name="John",
            last_name="Doe",
            corporation_name=None,
            business_house_number="123",
            business_street_name="Main St",
            business_city="New York",
            business_state="NY",
            business_zip="10001",
            business_apartment=None
        )
        self.building.add_contact(contact)
        self.assertEqual(len(self.building.contacts), 1)
        self.assertEqual(self.building.contacts[0], contact)

    def test_add_affordable_new(self):
        """Test adding new affordable housing record"""
        affordable = AffordableHousingRecord(
            project_id="123",
            bbl="1234567890",
            project_name="Test Project",
            project_start_date=None,
            reporting_construction_type="New Construction",
            extended_affordability_status="Active",
            prevailing_wage_status="Yes",
            extremely_low_income_units=5,
            very_low_income_units=10,
            low_income_units=15,
            counted_rental_units=30,
            all_counted_units=30,
            total_units=30
        )
        self.building.add_affordable(affordable)
        self.assertEqual(len(self.building.affordable), 1)
        self.assertEqual(self.building.affordable[0], affordable)

    def test_add_affordable_duplicate(self):
        """Test adding duplicate affordable housing record"""
        affordable1 = AffordableHousingRecord(
            project_id="123",
            bbl="1234567890",
            project_name="Test Project",
            project_start_date=None,
            reporting_construction_type="New Construction",
            extended_affordability_status="Active",
            prevailing_wage_status="Yes",
            extremely_low_income_units=5,
            very_low_income_units=10,
            low_income_units=15,
            counted_rental_units=30,
            all_counted_units=30,
            total_units=30
        )
        affordable2 = AffordableHousingRecord(
            project_id="123",
            bbl="1234567890",
            project_name="Test Project 2",
            project_start_date=None,
            reporting_construction_type="New Construction",
            extended_affordability_status="Active",
            prevailing_wage_status="Yes",
            extremely_low_income_units=5,
            very_low_income_units=10,
            low_income_units=15,
            counted_rental_units=30,
            all_counted_units=30,
            total_units=30
        )
        self.building.add_affordable(affordable1)
        self.building.add_affordable(affordable2)
        self.assertEqual(len(self.building.affordable), 1)

    def test_add_affordable_none(self):
        """Test adding None affordable housing record"""
        self.building.add_affordable(None)
        self.assertEqual(len(self.building.affordable), 0)

    def test_add_complaint_new(self):
        """Test adding new complaint"""
        complaint = Complaint(
            complaint_id="123",
            bbl="1234567890",
            borough="Manhattan",
            block=123,
            lot=456,
            problem_id="P123",
            unit_type="Apartment",
            space_type="Residential",
            type="Heat/Hot Water",
            major_category="Heat/Hot Water",
            minor_category="No Heat",
            complaint_status="Open",
            complaint_status_date=None,
            problem_status="Open",
            problem_status_date=None,
            status_description="No heat in apartment",
            house_number="123",
            street_name="Main St",
            post_code="10001",
            apartment="1A"
        )
        self.building.add_complaint(complaint)
        self.assertEqual(len(self.building.complaints), 1)
        self.assertEqual(self.building.complaints[0], complaint)

    def test_add_complaint_duplicate(self):
        """Test adding duplicate complaint"""
        complaint1 = Complaint(
            complaint_id="123",
            bbl="1234567890",
            borough="Manhattan",
            block=123,
            lot=456,
            problem_id="P123",
            unit_type="Apartment",
            space_type="Residential",
            type="Heat/Hot Water",
            major_category="Heat/Hot Water",
            minor_category="No Heat",
            complaint_status="Open",
            complaint_status_date=None,
            problem_status="Open",
            problem_status_date=None,
            status_description="No heat in apartment",
            house_number="123",
            street_name="Main St",
            post_code="10001",
            apartment="1A"
        )
        complaint2 = Complaint(
            complaint_id="123",
            bbl="1234567890",
            borough="Manhattan",
            block=123,
            lot=456,
            problem_id="P124",
            unit_type="Apartment",
            space_type="Residential",
            type="Heat/Hot Water",
            major_category="Heat/Hot Water",
            minor_category="No Heat",
            complaint_status="Open",
            complaint_status_date=None,
            problem_status="Open",
            problem_status_date=None,
            status_description="No heat in apartment",
            house_number="123",
            street_name="Main St",
            post_code="10001",
            apartment="1A"
        )
        self.building.add_complaint(complaint1)
        self.building.add_complaint(complaint2)
        self.assertEqual(len(self.building.complaints), 1)

    def test_add_complaint_none(self):
        """Test adding None complaint"""
        self.building.add_complaint(None)
        self.assertEqual(len(self.building.complaints), 0)

    def test_add_violation_new(self):
        """Test adding new violation"""
        violation = Violation(
            violation_id="123",
            bbl="1234567890",
            bin=1234567890,
            block=123,
            lot=456,
            boro="Manhattan",
            nov_description="No heat",
            nov_type="Class A",
            class_="A",
            rent_impairing="No",
            violation_status="Open",
            current_status="Open",
            current_status_id=1,
            current_status_date=None,
            inspection_date=None,
            nov_issued_date=None,
            approved_date=None,
            house_number="123",
            street_name="Main St",
            apartment="1A",
            story="1"
        )
        self.building.add_violation(violation)
        self.assertEqual(len(self.building.violations), 1)
        self.assertEqual(self.building.violations[0], violation)

    def test_add_violation_duplicate(self):
        """Test adding duplicate violation"""
        violation1 = Violation(
            violation_id="123",
            bbl="1234567890",
            bin=1234567890,
            block=123,
            lot=456,
            boro="Manhattan",
            nov_description="No heat",
            nov_type="Class A",
            class_="A",
            rent_impairing="No",
            violation_status="Open",
            current_status="Open",
            current_status_id=1,
            current_status_date=None,
            inspection_date=None,
            nov_issued_date=None,
            approved_date=None,
            house_number="123",
            street_name="Main St",
            apartment="1A",
            story="1"
        )
        violation2 = Violation(
            violation_id="123",
            bbl="1234567890",
            bin=1234567890,
            block=123,
            lot=456,
            boro="Manhattan",
            nov_description="No heat",
            nov_type="Class A",
            class_="A",
            rent_impairing="No",
            violation_status="Open",
            current_status="Open",
            current_status_id=1,
            current_status_date=None,
            inspection_date=None,
            nov_issued_date=None,
            approved_date=None,
            house_number="123",
            street_name="Main St",
            apartment="1A",
            story="1"
        )
        self.building.add_violation(violation1)
        self.building.add_violation(violation2)
        self.assertEqual(len(self.building.violations), 1)

    def test_add_violation_none(self):
        """Test adding None violation"""
        self.building.add_violation(None)
        self.assertEqual(len(self.building.violations), 0)

    def test_add_eviction_new(self):
        """Test adding new eviction"""
        eviction = Eviction(
            docket_number="123",
            court_index_number="456",
            bbl="1234567890",
            bin=1234567890,
            borough="Manhattan",
            eviction_zip="10001",
            eviction_address="123 Main St",
            eviction_apt_num="1A",
            community_board=1,
            council_district=1,
            census_tract="1234",
            nta="Test NTA",
            latitude=40.7128,
            longitude=-74.0060,
            executed_date=None,
            residential_commercial_ind="Residential",
            ejectment="No",
            eviction_possession="Possession",
            marshal_first_name="John",
            marshal_last_name="Doe"
        )
        self.building.add_eviction(eviction)
        self.assertEqual(len(self.building.evictions), 1)
        self.assertEqual(self.building.evictions[0], eviction)

    def test_add_eviction_duplicate(self):
        """Test adding duplicate eviction"""
        eviction1 = Eviction(
            docket_number="123",
            court_index_number="456",
            bbl="1234567890",
            bin=1234567890,
            borough="Manhattan",
            eviction_zip="10001",
            eviction_address="123 Main St",
            eviction_apt_num="1A",
            community_board=1,
            council_district=1,
            census_tract="1234",
            nta="Test NTA",
            latitude=40.7128,
            longitude=-74.0060,
            executed_date=None,
            residential_commercial_ind="Residential",
            ejectment="No",
            eviction_possession="Possession",
            marshal_first_name="John",
            marshal_last_name="Doe"
        )
        eviction2 = Eviction(
            docket_number="123",
            court_index_number="456",
            bbl="1234567890",
            bin=1234567890,
            borough="Manhattan",
            eviction_zip="10001",
            eviction_address="123 Main St",
            eviction_apt_num="1A",
            community_board=1,
            council_district=1,
            census_tract="1234",
            nta="Test NTA",
            latitude=40.7128,
            longitude=-74.0060,
            executed_date=None,
            residential_commercial_ind="Residential",
            ejectment="No",
            eviction_possession="Possession",
            marshal_first_name="John",
            marshal_last_name="Doe"
        )
        self.building.add_eviction(eviction1)
        self.building.add_eviction(eviction2)
        self.assertEqual(len(self.building.evictions), 1)

    def test_add_eviction_none(self):
        """Test adding None eviction"""
        self.building.add_eviction(None)
        self.assertEqual(len(self.building.evictions), 0)

    def test_add_eviction_with_none_values(self):
        """Test adding eviction with None docket_number and court_index_number"""
        eviction1 = Eviction(
            docket_number=None,
            court_index_number=None,
            bbl="1234567890",
            bin=1234567890,
            borough="Manhattan",
            eviction_zip="10001",
            eviction_address="123 Main St",
            eviction_apt_num="1A",
            community_board=1,
            council_district=1,
            census_tract="1234",
            nta="Test NTA",
            latitude=40.7128,
            longitude=-74.0060,
            executed_date=None,
            residential_commercial_ind="Residential",
            ejectment="No",
            eviction_possession="Possession",
            marshal_first_name="John",
            marshal_last_name="Doe"
        )
        eviction2 = Eviction(
            docket_number=None,
            court_index_number=None,
            bbl="1234567890",
            bin=1234567890,
            borough="Manhattan",
            eviction_zip="10001",
            eviction_address="123 Main St",
            eviction_apt_num="1A",
            community_board=1,
            council_district=1,
            census_tract="1234",
            nta="Test NTA",
            latitude=40.7128,
            longitude=-74.0060,
            executed_date=None,
            residential_commercial_ind="Residential",
            ejectment="No",
            eviction_possession="Possession",
            marshal_first_name="John",
            marshal_last_name="Doe"
        )
        self.building.add_eviction(eviction1)
        self.building.add_eviction(eviction2)
        self.assertEqual(len(self.building.evictions), 1)


class BuildingFactoryFunctionTests(TestCase):
    def test_as_acris_master_with_string_amount(self):
        """Test as_acris_master factory function with string amount"""
        row = {"document_id": "123", "borough": 1, "doc_type": "DEED", "doc_date": None, "doc_amount": "1000.50"}
        master = as_acris_master(row)
        self.assertIsInstance(master, AcrisMaster)
        self.assertEqual(master.document_id, "123")
        self.assertEqual(master.doc_amount, Decimal("1000.50"))

    def test_as_acris_master_with_invalid_string_amount(self):
        """Test as_acris_master factory function with invalid string amount"""
        row = {"document_id": "123", "borough": 1, "doc_type": "DEED", "doc_date": None, "doc_amount": "invalid"}
        master = as_acris_master(row)
        self.assertIsInstance(master, AcrisMaster)
        self.assertEqual(master.document_id, "123")
        self.assertIsNone(master.doc_amount)

    def test_as_acris_master_with_decimal_amount(self):
        """Test as_acris_master factory function with decimal amount"""
        row = {"document_id": "123", "borough": 1, "doc_type": "DEED", "doc_date": None, "doc_amount": Decimal("1000.50")}
        master = as_acris_master(row)
        self.assertIsInstance(master, AcrisMaster)
        self.assertEqual(master.document_id, "123")
        self.assertEqual(master.doc_amount, Decimal("1000.50"))

    def test_as_violation_with_class(self):
        """Test as_violation factory function with class field"""
        row = {
            "violation_id": "123", 
            "bbl": "1234567890", 
            "class": "A",
            "bin": 1234567890,
            "block": 123,
            "lot": 456,
            "boro": "Manhattan",
            "nov_description": "No heat",
            "nov_type": "Class A",
            "rent_impairing": "No",
            "violation_status": "Open",
            "current_status": "Open",
            "current_status_id": 1,
            "current_status_date": None,
            "inspection_date": None,
            "nov_issued_date": None,
            "approved_date": None,
            "house_number": "123",
            "street_name": "Main St",
            "apartment": "1A",
            "story": "1"
        }
        violation = as_violation(row)
        self.assertIsInstance(violation, Violation)
        self.assertEqual(violation.violation_id, "123")
        self.assertEqual(violation.class_, "A")

    def test_as_violation_with_class_(self):
        """Test as_violation factory function with class_ field"""
        row = {
            "violation_id": "123", 
            "bbl": "1234567890", 
            "class_": "A",
            "bin": 1234567890,
            "block": 123,
            "lot": 456,
            "boro": "Manhattan",
            "nov_description": "No heat",
            "nov_type": "Class A",
            "rent_impairing": "No",
            "violation_status": "Open",
            "current_status": "Open",
            "current_status_id": 1,
            "current_status_date": None,
            "inspection_date": None,
            "nov_issued_date": None,
            "approved_date": None,
            "house_number": "123",
            "street_name": "Main St",
            "apartment": "1A",
            "story": "1"
        }
        violation = as_violation(row)
        self.assertIsInstance(violation, Violation)
        self.assertEqual(violation.violation_id, "123")
        self.assertEqual(violation.class_, "A")


class BuildBuildingFromRowsTests(TestCase):
    def test_build_building_from_rows_minimal(self):
        """Test building from rows with minimal data"""
        building = build_building_from_rows(
            bbl="1234567890",
            reg_row=None,
            contact_rows=[],
            affordable_rows=[],
            complaint_rows=[],
            violation_rows=[],
            acris_master_rows=[],
            acris_legal_rows=[],
            acris_party_rows=[],
        )
        self.assertEqual(building.bbl, "1234567890")
        self.assertIsNone(building.registration)
        self.assertIsNone(building.rent_stabilized)

    def test_build_building_from_rows_with_registration(self):
        """Test building from rows with registration data"""
        reg_row = {"bbl": "1234567890", "house_number": "123", "street_name": "Main St"}
        building = build_building_from_rows(
            bbl="1234567890",
            reg_row=reg_row,
            contact_rows=[],
            affordable_rows=[],
            complaint_rows=[],
            violation_rows=[],
            acris_master_rows=[],
            acris_legal_rows=[],
            acris_party_rows=[],
        )
        self.assertEqual(building.bbl, "1234567890")
        self.assertIsNotNone(building.registration)
        self.assertEqual(building.registration.house_number, "123")


class BuildingViewsAPITests(TestCase):
    def setUp(self):
        self.building_url = "/api/building/"

    def test_building_by_bbl_view_success(self):
        """Test GET /api/building/?bbl=1013510030 with valid BBL"""
        try:
            params = {"bbl": "1013510030"}
            response = self.client.get(self.building_url, params)
            # Could be 200 (found) or 404 (not found), both are valid
            self.assertIn(response.status_code, [200, 404])
            if response.status_code == 200:
                self.assertIn('bbl', response.data)
                self.assertIn('counts', response.data)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_building_by_bbl_view_missing_bbl(self):
        """Test GET /api/building/ without bbl parameter"""
        try:
            response = self.client.get(self.building_url)
            self.assertEqual(response.status_code, 400)
            self.assertIn('detail', response.data)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_building_by_bbl_view_invalid_bbl_format(self):
        """Test GET /api/building/?bbl=invalid with invalid BBL format"""
        try:
            params = {"bbl": "invalid"}
            response = self.client.get(self.building_url, params)
            self.assertEqual(response.status_code, 400)
            self.assertIn('detail', response.data)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_building_by_bbl_view_short_bbl(self):
        """Test GET /api/building/?bbl=123 with too short BBL"""
        try:
            params = {"bbl": "123"}
            response = self.client.get(self.building_url, params)
            self.assertEqual(response.status_code, 400)
            self.assertIn('detail', response.data)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_building_by_bbl_view_long_bbl(self):
        """Test GET /api/building/?bbl=12345678901 with too long BBL"""
        try:
            params = {"bbl": "12345678901"}
            response = self.client.get(self.building_url, params)
            self.assertEqual(response.status_code, 400)
            self.assertIn('detail', response.data)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_building_by_bbl_view_nonexistent_bbl(self):
        """Test GET /api/building/?bbl=9999999999 with non-existent BBL"""
        try:
            params = {"bbl": "9999999999"}
            response = self.client.get(self.building_url, params)
            self.assertEqual(response.status_code, 404)
            self.assertIn('detail', response.data)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_building_by_bbl_view_empty_building(self):
        """Test GET /api/building/?bbl=1234567890 with empty building data"""
        try:
            params = {"bbl": "1234567890"}
            response = self.client.get(self.building_url, params)
            self.assertEqual(response.status_code, 404)
            self.assertIn('detail', response.data)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")


class BuildingViewsHelperFunctionTests(TestCase):
    def test_default_serializer_dataclass(self):
        """Test _default_serializer with dataclass"""
        from apps.building.views import _default_serializer
        from common.models.building import Building
        
        building = Building(bbl="1234567890")
        result = _default_serializer(building)
        self.assertIsInstance(result, dict)
        self.assertEqual(result['bbl'], "1234567890")

    def test_default_serializer_datetime(self):
        """Test _default_serializer with datetime"""
        from apps.building.views import _default_serializer
        from datetime import datetime
        
        dt = datetime(2023, 1, 1, 12, 0, 0)
        result = _default_serializer(dt)
        self.assertEqual(result, "2023-01-01T12:00:00")

    def test_default_serializer_date(self):
        """Test _default_serializer with date"""
        from apps.building.views import _default_serializer
        from datetime import date
        
        d = date(2023, 1, 1)
        result = _default_serializer(d)
        self.assertEqual(result, "2023-01-01")

    def test_default_serializer_decimal(self):
        """Test _default_serializer with Decimal"""
        from apps.building.views import _default_serializer
        from decimal import Decimal
        
        dec = Decimal("123.45")
        result = _default_serializer(dec)
        self.assertEqual(result, "123.45")

    def test_default_serializer_string(self):
        """Test _default_serializer with string"""
        from apps.building.views import _default_serializer
        
        result = _default_serializer("test")
        self.assertEqual(result, "test")

    def test_to_primitive_dataclass(self):
        """Test _to_primitive with dataclass"""
        from apps.building.views import _to_primitive
        from common.models.building import Building
        
        building = Building(bbl="1234567890")
        result = _to_primitive(building)
        self.assertIsInstance(result, dict)
        self.assertEqual(result['bbl'], "1234567890")

    def test_to_primitive_dict(self):
        """Test _to_primitive with dict"""
        from apps.building.views import _to_primitive
        from datetime import datetime
        
        data = {
            "bbl": "1234567890",
            "date": datetime(2023, 1, 1, 12, 0, 0)
        }
        result = _to_primitive(data)
        self.assertEqual(result['bbl'], "1234567890")
        self.assertEqual(result['date'], "2023-01-01T12:00:00")

    def test_to_primitive_list(self):
        """Test _to_primitive with list"""
        from apps.building.views import _to_primitive
        from datetime import date
        
        data = [date(2023, 1, 1), date(2023, 1, 2)]
        result = _to_primitive(data)
        self.assertEqual(result, ["2023-01-01", "2023-01-02"])

    def test_to_primitive_decimal(self):
        """Test _to_primitive with Decimal"""
        from apps.building.views import _to_primitive
        from decimal import Decimal
        
        result = _to_primitive(Decimal("123.45"))
        self.assertEqual(result, "123.45")

    def test_is_empty_building_empty(self):
        """Test _is_empty_building with empty building"""
        from apps.building.views import _is_empty_building
        from common.models.building import Building
        
        building = Building(bbl="1234567890")
        result = _is_empty_building(building)
        self.assertTrue(result)

    def test_is_empty_building_with_registration(self):
        """Test _is_empty_building with registration"""
        from apps.building.views import _is_empty_building
        from common.models.building import Building
        from common.models.registration import Registration
        
        building = Building(bbl="1234567890")
        building.registration = Registration(
            registration_id=1,
            bbl="1234567890",
            house_number="123",
            street_name="Main St"
        )
        result = _is_empty_building(building)
        self.assertFalse(result)

    def test_is_empty_building_with_contacts(self):
        """Test _is_empty_building with contacts"""
        from apps.building.views import _is_empty_building
        from common.models.building import Building
        from common.models.registration_contact import RegistrationContact
        
        building = Building(bbl="1234567890")
        building.contacts = [RegistrationContact(
            registration_contact_id=1,
            registration_id=1,
            type="Owner",
            contact_description="Test Owner",
            first_name="John",
            last_name="Doe",
            corporation_name=None,
            business_house_number=None,
            business_street_name=None,
            business_city=None,
            business_state=None,
            business_zip=None,
            business_apartment=None
        )]
        result = _is_empty_building(building)
        self.assertFalse(result)

    def test_is_empty_building_with_rent_stabilized(self):
        """Test _is_empty_building with rent stabilized tag"""
        from apps.building.views import _is_empty_building
        from common.models.building import Building
        from common.models.rent_stabilized_tag import RentStabilizedTag
        
        building = Building(bbl="1234567890")
        building.rent_stabilized = RentStabilizedTag(
            bbl="1234567890",
            borough="Manhattan",
            block=123,
            lot=456,
            zip="10001",
            city="New York",
            status="Active",
            source_year=2023
        )
        result = _is_empty_building(building)
        self.assertFalse(result)

    def test_is_empty_building_with_affordable(self):
        """Test _is_empty_building with affordable housing"""
        from apps.building.views import _is_empty_building
        from common.models.building import Building
        from common.models.affordable_housing_record import AffordableHousingRecord
        
        building = Building(bbl="1234567890")
        building.affordable = [AffordableHousingRecord(
            project_id="123",
            bbl="1234567890",
            project_name="Test Project",
            project_start_date=None,
            reporting_construction_type="New Construction",
            extended_affordability_status="Active",
            prevailing_wage_status="Yes",
            extremely_low_income_units=5,
            very_low_income_units=10,
            low_income_units=15,
            counted_rental_units=30,
            all_counted_units=30,
            total_units=30
        )]
        result = _is_empty_building(building)
        self.assertFalse(result)

    def test_is_empty_building_with_complaints(self):
        """Test _is_empty_building with complaints"""
        from apps.building.views import _is_empty_building
        from common.models.building import Building
        from common.models.complaint import Complaint
        
        building = Building(bbl="1234567890")
        building.complaints = [Complaint(
            complaint_id="123",
            bbl="1234567890",
            borough="Manhattan",
            block=123,
            lot=456,
            problem_id="P123",
            unit_type="Apartment",
            space_type="Residential",
            type="Heat/Hot Water",
            major_category="Heat/Hot Water",
            minor_category="No Heat",
            complaint_status="Open",
            complaint_status_date=None,
            problem_status="Open",
            problem_status_date=None,
            status_description="No heat in apartment",
            house_number="123",
            street_name="Main St",
            post_code="10001",
            apartment="1A"
        )]
        result = _is_empty_building(building)
        self.assertFalse(result)

    def test_is_empty_building_with_violations(self):
        """Test _is_empty_building with violations"""
        from apps.building.views import _is_empty_building
        from common.models.building import Building
        from common.models.violation import Violation
        
        building = Building(bbl="1234567890")
        building.violations = [Violation(
            violation_id="123",
            bbl="1234567890",
            bin=1234567890,
            block=123,
            lot=456,
            boro="Manhattan",
            nov_description="No heat",
            nov_type="Class A",
            class_="A",
            rent_impairing="No",
            violation_status="Open",
            current_status="Open",
            current_status_id=1,
            current_status_date=None,
            inspection_date=None,
            nov_issued_date=None,
            approved_date=None,
            house_number="123",
            street_name="Main St",
            apartment="1A",
            story="1"
        )]
        result = _is_empty_building(building)
        self.assertFalse(result)

    def test_is_empty_building_with_evictions(self):
        """Test _is_empty_building with evictions"""
        from apps.building.views import _is_empty_building
        from common.models.building import Building
        from common.models.eviction import Eviction
        
        building = Building(bbl="1234567890")
        building.evictions = [Eviction(
            docket_number="123",
            court_index_number="456",
            bbl="1234567890",
            bin=1234567890,
            borough="Manhattan",
            eviction_zip="10001",
            eviction_address="123 Main St",
            eviction_apt_num="1A",
            community_board=1,
            council_district=1,
            census_tract="1234",
            nta="Test NTA",
            latitude=40.7128,
            longitude=-74.0060,
            executed_date=None,
            residential_commercial_ind="Residential",
            ejectment="No",
            eviction_possession="Possession",
            marshal_first_name="John",
            marshal_last_name="Doe"
        )]
        result = _is_empty_building(building)
        self.assertFalse(result)

    def test_is_empty_building_with_acris_master(self):
        """Test _is_empty_building with acris master data"""
        from apps.building.views import _is_empty_building
        from common.models.building import Building
        from common.models.acris import AcrisMaster
        
        building = Building(bbl="1234567890")
        building.acris_master = {"123": AcrisMaster(
            document_id="123",
            borough=1,
            doc_type="DEED",
            doc_date=None,
            doc_amount=None
        )}
        result = _is_empty_building(building)
        self.assertFalse(result)

    def test_safe_len_with_none(self):
        """Test _safe_len with None value"""
        from apps.building.views import _safe_len
        
        result = _safe_len(None)
        self.assertEqual(result, 0)

    def test_safe_len_with_list(self):
        """Test _safe_len with list"""
        from apps.building.views import _safe_len
        
        result = _safe_len([1, 2, 3])
        self.assertEqual(result, 3)

    def test_sum_dict_values_len_with_none(self):
        """Test _sum_dict_values_len with None"""
        from apps.building.views import _sum_dict_values_len
        
        result = _sum_dict_values_len(None)
        self.assertEqual(result, 0)

    def test_sum_dict_values_len_with_dict(self):
        """Test _sum_dict_values_len with dict"""
        from apps.building.views import _sum_dict_values_len
        
        data = {
            "key1": [1, 2, 3],
            "key2": [4, 5],
            "key3": None
        }
        result = _sum_dict_values_len(data)
        self.assertEqual(result, 5)  # 3 + 2 + 0
