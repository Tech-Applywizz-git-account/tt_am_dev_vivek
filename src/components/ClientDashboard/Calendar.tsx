import React, { useState, useEffect } from 'react';
import './Calendar.css'; // Make sure this path is correct
import { ChevronLeft, ChevronRight } from 'lucide-react';

const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarProps {
    onDateSelect?: (date: Date) => void;
}

interface DateInfo {
    day: number;
    month: string;
    year: number;
    weekday: string;
    isCurrentMonth: boolean;
    isToday: boolean;
    dateObj: Date;
}

const Calendar: React.FC<CalendarProps> = ({ onDateSelect }) => {
    const [currentDate, setCurrentDate] = useState(new Date()); // State for the month being viewed
    const [selectedDate, setSelectedDate] = useState(new Date()); // State for the selected date
    const [isRightPanelActive, setIsRightPanelActive] = useState(false);
    const [rotationClass, setRotationClass] = useState('');

    const [calendarGrid, setCalendarGrid] = useState<DateInfo[]>([]);

    useEffect(() => {
        generateCalendar(currentDate);
    }, [currentDate]);

    const generateCalendar = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
        const daysInMonth = lastDayOfMonth.getDate();

        const grid: DateInfo[] = [];
        const today = new Date();

        // Previous month filler
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = 0; i < startingDayOfWeek; i++) {
            // We can just add empty slots or actual previous month dates if we want
            // The original code seems to just fill cells. Let's act like standard calendar.
            // Actually, the original code logic `getNextMonth` etc is a bit complex.
            // Let's implement a standard grid.
            grid.push({
                day: prevMonthLastDay - startingDayOfWeek + 1 + i,
                month: months[month === 0 ? 11 : month - 1],
                year: month === 0 ? year - 1 : year,
                weekday: daysOfWeek[i],
                isCurrentMonth: false,
                isToday: false,
                dateObj: new Date(year, month - 1, prevMonthLastDay - startingDayOfWeek + 1 + i)
            })
        }

        // Current month
        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(year, month, i);
            grid.push({
                day: i,
                month: months[month],
                year: year,
                weekday: daysOfWeek[d.getDay()],
                isCurrentMonth: true,
                isToday: d.toDateString() === today.toDateString(),
                dateObj: d
            });
        }

        // Next month filler to complete the grid (usually 35 or 42 cells)
        const remainingCells = 42 - grid.length; // 6 rows * 7 cols
        for (let i = 1; i <= remainingCells; i++) {
            grid.push({
                day: i,
                month: months[month === 11 ? 0 : month + 1],
                year: month === 11 ? year + 1 : year,
                weekday: daysOfWeek[(lastDayOfMonth.getDay() + i) % 7],
                isCurrentMonth: false,
                isToday: false,
                dateObj: new Date(year, month + 1, i)
            });
        }

        // The original code filtered out 31 days logic weirdly, but standard calendar is better.
        // However, we need to match the visual "weekdays" header.
        // We will just slice this grid into chunks of 7 for rendering rows.
        setCalendarGrid(grid);
    };

    const handlePrevMonth = () => {
        setRotationClass('is-rotated-left');
        setTimeout(() => setRotationClass(''), 195);
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setRotationClass('is-rotated-right');
        setTimeout(() => setRotationClass(''), 195);
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleDateClick = (dateInfo: DateInfo) => {
        if (!dateInfo.isCurrentMonth) {
            // Optional: jump to that month?
            // For now just select it
        }
        if (onDateSelect) {
            onDateSelect(dateInfo.dateObj);
        }
    };

    const toggleRightPanel = () => {
        setIsRightPanelActive(!isRightPanelActive);
    };

    // Helper to chunk grid into weeks
    const weeks = [];
    for (let i = 0; i < calendarGrid.length; i += 7) {
        weeks.push(calendarGrid.slice(i, i + 7));
    }
    // Limit to 6 weeks max to fit layout
    const visibleWeeks = weeks.slice(0, 6);

    return (
        <div className="calendar-wrapper">
            <div className={`content-wrapper ${rotationClass}`}>
                <div className="left-wrapper">
                    <div className="header">
                        <ChevronLeft onClick={handlePrevMonth} className="cursor-pointer hover:text-teal-600" />
                        <span>
                            <span className="month">{months[currentDate.getMonth()]}</span>{' '}
                            <span className="year">{currentDate.getFullYear()}</span>
                        </span>
                        <ChevronRight onClick={handleNextMonth} className="cursor-pointer hover:text-teal-600" />
                    </div>

                    <div className="calender">
                        <table>
                            <thead>
                                <tr className="weedays">
                                    {daysOfWeek.map((day, index) => (
                                        <th key={day} data-weekday={day.toLowerCase()} data-column={index}>{day}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {visibleWeeks.map((week, rowIndex) => (
                                    <tr key={rowIndex} className="days" data-row={rowIndex}>
                                        {week.map((dateInfo, colIndex) => {
                                            const isSelected = selectedDate.toDateString() === dateInfo.dateObj.toDateString();
                                            return (
                                                <td
                                                    key={colIndex}
                                                    data-column={colIndex}
                                                    className={`
                                                        ${dateInfo.isCurrentMonth ? 'selectable' : 'text-gray-300'}
                                                        ${dateInfo.isToday ? 'currentDay' : ''}
                                                        ${isSelected ? 'active' : ''}
                                                    `}
                                                    onClick={() => handleDateClick(dateInfo)}
                                                >
                                                    {dateInfo.day}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Toggle button removed */}
                </div>
            </div>

            {/* Right wrapper removed from view */}
        </div>
    );
};

export default Calendar;
