"""SDD-039: acesso a corredores com geometrias sintéticas DEMO."""

import pytest
from shapely.geometry import LineString, Point

from scripts.build_scenario import entry_fraction


def test_entry_uses_the_buffer_of_the_curve_not_distance_to_node():
    line = LineString([(0, 0), (0, 100), (100, 100)])
    assert entry_fraction(line, Point(0, 75), 25) == pytest.approx(0.25, abs=1e-8)
    assert entry_fraction(line, Point(75, 100), 25) == pytest.approx(0.75, abs=1e-8)
    assert entry_fraction(line, Point(50, 50), 25) is None


def test_reversed_direction_and_points_beyond_the_road():
    line = LineString([(100, 0), (0, 0)])
    assert entry_fraction(line, Point(75, 0), 25) == pytest.approx(0, abs=1e-8)
    assert entry_fraction(line, Point(-50, 0), 25) is None
