#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PSAT & 학기 병행 캘린더 생성기 (2026.08.31 ~ 2027.02.15)
- psat_study.ics : PSAT 학습 일정 (6단계 페이즈별 반영)
- college_classes.ics : 대학교 수업 및 중간/기말 집중 대비 일정
- daily_routine.ics : 기상, 식사, 운동, 샤워, 휴식 등 일상 루틴
"""

import uuid
from datetime import datetime, date, time, timedelta

VTIMEZONE_KST = """BEGIN:VTIMEZONE
TZID:Asia/Seoul
X-LIC-LOCATION:Asia/Seoul
BEGIN:STANDARD
TZOFFSETFROM:+0900
TZOFFSETTO:+0900
TZNAME:KST
DTSTART:19700101T000000
END:STANDARD
END:VTIMEZONE
"""

def format_dt(dt: datetime) -> str:
    return dt.strftime("%Y%m%dT%H%M%S")

def make_event(uid: str, summary: str, start_dt: datetime, end_dt: datetime, description: str = "", location: str = "") -> str:
    now_stamp = format_dt(datetime.now())
    # Escape special characters for ics text
    desc_escaped = description.replace("\\", "\\\\").replace("\n", "\\n").replace(",", "\\,").replace(";", "\\;")
    loc_escaped = location.replace("\\", "\\\\").replace("\n", "\\n").replace(",", "\\,").replace(";", "\\;")
    summary_escaped = summary.replace("\\", "\\\\").replace("\n", " ").replace(",", "\\,").replace(";", "\\;")
    
    event_str = f"""BEGIN:VEVENT
UID:{uid}@psat.study
DTSTAMP:{now_stamp}
DTSTART;TZID=Asia/Seoul:{format_dt(start_dt)}
DTEND;TZID=Asia/Seoul:{format_dt(end_dt)}
SUMMARY:{summary_escaped}
DESCRIPTION:{desc_escaped}
"""
    if location:
        event_str += f"LOCATION:{loc_escaped}\n"
        
    # 10 minute alarm
    event_str += """BEGIN:VALARM
TRIGGER:-PT10M
ACTION:DISPLAY
DESCRIPTION:일정 10분 전 알림
END:VALARM
END:VEVENT
"""
    return event_str

def daterange(start_date: date, end_date: date):
    curr = start_date
    while curr <= end_date:
        yield curr
        curr += timedelta(days=1)

def main():
    START_DATE = date(2026, 8, 31)   # 월요일 (개강)
    END_DATE = date(2027, 2, 15)     # 월요일 (5급 공채 1차 실전 직전)
    
    # 주요 구분 날짜
    # Phase 1: 2026-08-31 ~ 2026-09-06 (1주차: 순수 계산 집중 + 밤도리 기초, 조훈 인강 X)
    # Phase 2: 2026-09-07 ~ 2026-10-04 (2~5주차: 조훈 인강 3주 완강[9/7~9/27], 계산 2주차까지 후 기출/밤도리 심화 1:1 대체)
    # Phase 3: 2026-10-05 ~ 2026-10-23 (6~8주차: 중간고사 2주전~시험주간[10/19~23] 대학 전공 집중)
    # Phase 4: 2026-10-24 ~ 2026-11-30 (9~14주차: 학기 후반 심화 루틴)
    # Phase 5: 2026-12-01 ~ 2026-12-18 (15~16주차: 기말고사 2주전~시험주간[12/15~18] 전공 올인)
    # Phase 6: 2026-12-19 ~ 2027-02-15 (겨울방학 실전 스프린트: 5급 실전 시험 시간표 체제)

    psat_events = []
    college_events = []
    routine_events = []

    for curr_day in daterange(START_DATE, END_DATE):
        weekday = curr_day.weekday() # 0: Mon, 1: Tue, ..., 5: Sat, 6: Sun

        # =========================================================
        # 1. DAILY ROUTINE (생활 루틴 캘린더)
        # =========================================================
        if weekday == 6: # 일요일
            # 일요일 완전 휴식
            uid = f"routine-sun-{curr_day.strftime('%Y%m%d')}"
            routine_events.append(make_event(
                uid=uid,
                summary="[루틴] 일요일 완전 휴식 (Recharge Day)",
                start_dt=datetime.combine(curr_day, time(9, 0)),
                end_dt=datetime.combine(curr_day, time(22, 0)),
                description="한 주간의 피로를 풀고 재충전하는 자유 휴일입니다."
            ))
        else:
            # 주중 vs 토요일 기상 시간 (방학 실전 모드 Phase 6에서는 월~토 모두 실전 시험 리듬으로 07:30 기상)
            if weekday == 5 and curr_day < date(2026, 12, 19): # 학기 중 토요일
                wake_start, wake_end = time(8, 30), time(9, 30)
            else: # 주중 (월~금) 및 방학 중 월~토
                wake_start, wake_end = time(7, 30), time(8, 30)
                prep_start, prep_end = time(8, 30), time(9, 0)
                routine_events.append(make_event(
                    uid=f"routine-prep-{curr_day.strftime('%Y%m%d')}",
                    summary="[루틴] 이동 및 하루 일과 준비",
                    start_dt=datetime.combine(curr_day, prep_start),
                    end_dt=datetime.combine(curr_day, prep_end),
                    description="공부 장소 도착, 오늘 학습 플랜 확인 및 데스크 정리"
                ))

            routine_events.append(make_event(
                uid=f"routine-wake-{curr_day.strftime('%Y%m%d')}",
                summary="[루틴] 기상 및 아침 식사/준비",
                start_dt=datetime.combine(curr_day, wake_start),
                end_dt=datetime.combine(curr_day, wake_end),
                description="충분한 수분 섭취 및 가벼운 아침 식사"
            ))

            # 점심
            # 방학 실전(Phase 6): 12:15~14:00, 화/목: 12:00~13:30 (수업 직후 점심), 금요일: 13:00~14:00, 월/수/토: 13:00~14:30
            if curr_day >= date(2026, 12, 19):
                lunch_start, lunch_end = time(12, 15), time(14, 0)
                lunch_desc = "실전 시험 리듬 맞춤: 점심 식사(소화 잘되는 식단) 및 2교시 자료해석 전 휴식"
            elif weekday == 4: # 금요일
                lunch_start, lunch_end = time(13, 0), time(14, 0)
                lunch_desc = "모의고사 점심 식사 (14:00 자료해석 모의고사 대비 소화 및 휴식)"
            elif weekday in [1, 3]: # 화, 목 (12:00 식사)
                lunch_start, lunch_end = time(12, 0), time(13, 30)
                lunch_desc = "GIS 수업 직후 점심 식사 및 휴식 (화/목 12:00 점심)"
            else: # 월, 수, 토
                lunch_start, lunch_end = time(13, 0), time(14, 30)
                lunch_desc = "점심 식사 및 충분한 산책/휴식"

            routine_events.append(make_event(
                uid=f"routine-lunch-{curr_day.strftime('%Y%m%d')}",
                summary="[루틴] 점심 식사 및 휴식",
                start_dt=datetime.combine(curr_day, lunch_start),
                end_dt=datetime.combine(curr_day, lunch_end),
                description=lunch_desc
            ))

            # 저녁 식사 및 운동/샤워 (목요일 vs 다른 요일)
            if weekday == 3: # 목요일: 기숙사 -> 집 이동 및 귀가 후 저녁/휴식
                routine_events.append(make_event(
                    uid=f"routine-transit-dorm-home-{curr_day.strftime('%Y%m%d')}",
                    summary="[루틴] 기숙사에서 집으로 이동 (귀가)",
                    start_dt=datetime.combine(curr_day, time(16, 0)),
                    end_dt=datetime.combine(curr_day, time(18, 30)),
                    description="주말 귀가를 위해 기숙사에서 짐 정리 후 본가(집)로 이동 및 휴식"
                ))
                routine_events.append(make_event(
                    uid=f"routine-dinner-home-{curr_day.strftime('%Y%m%d')}",
                    summary="[루틴] 저녁 식사 및 휴식 (집 도착)",
                    start_dt=datetime.combine(curr_day, time(18, 30)),
                    end_dt=datetime.combine(curr_day, time(20, 0)),
                    description="본가 도착 후 저녁 식사, 짐 정리 및 휴식 (20:00 정각 공부 착석 준비)"
                ))
            else: # 월, 화, 수, 금, 토
                # 저녁 식사 (17:00 ~ 18:30, 30분 앞당김)
                dinner_start, dinner_end = time(17, 0), time(18, 30)

                routine_events.append(make_event(
                    uid=f"routine-dinner-{curr_day.strftime('%Y%m%d')}",
                    summary="[루틴] 저녁 식사 및 휴식",
                    start_dt=datetime.combine(curr_day, dinner_start),
                    end_dt=datetime.combine(curr_day, dinner_end),
                    description="저녁 식사 및 가벼운 휴식/스트레칭"
                ))

                # 운동 및 샤워 (운동 18:30~19:30, 샤워 19:30~20:00 -> 20:00 야간 일과 시작)
                routine_events.append(make_event(
                    uid=f"routine-workout-{curr_day.strftime('%Y%m%d')}",
                    summary="[루틴] 체력 단련 및 운동 (1시간)",
                    start_dt=datetime.combine(curr_day, time(18, 30)),
                    end_dt=datetime.combine(curr_day, time(19, 30)),
                    description="PSAT 집중력 유지를 위한 유산소 및 근력 운동"
                ))
                routine_events.append(make_event(
                    uid=f"routine-shower-{curr_day.strftime('%Y%m%d')}",
                    summary="[루틴] 샤워 및 정리 (30분, 20시 완료)",
                    start_dt=datetime.combine(curr_day, time(19, 30)),
                    end_dt=datetime.combine(curr_day, time(20, 0)),
                    description="샤워 후 편안한 복장 환복 및 20:00 저녁/야간 학습 준비 완료"
                ))

            # 취침 준비
            routine_events.append(make_event(
                uid=f"routine-sleep-{curr_day.strftime('%Y%m%d')}",
                summary="[루틴] 하루 마감 및 취침 준비",
                start_dt=datetime.combine(curr_day, time(23, 30)),
                end_dt=datetime.combine(curr_day, time(23, 59)),
                description="스마트폰 멀리하기, 학습 일지 간단 기록, 숙면 환경 조성"
            ))

        # =========================================================
        # 2. COLLEGE CLASSES (대학 수업 및 중간/기말 캘린더, 종강 12/18까지)
        # =========================================================
        if curr_day <= date(2026, 12, 18):
            # 정규 수업 (월~목)
            if weekday in [0, 2]: # 월, 수
                # 수업 이동
                college_events.append(make_event(
                    uid=f"college-mov-pol-{curr_day.strftime('%Y%m%d')}",
                    summary="[대학] 수업 이동 및 준비 (30분)",
                    start_dt=datetime.combine(curr_day, time(11, 30)),
                    end_dt=datetime.combine(curr_day, time(12, 0)),
                    description="강의실 이동 및 정치학원론 수업 교재/노트 준비"
                ))
                # 정치학원론
                college_events.append(make_event(
                    uid=f"college-class-pol-{curr_day.strftime('%Y%m%d')}",
                    summary="[수업] 정치학원론 (월/수)",
                    start_dt=datetime.combine(curr_day, time(12, 0)),
                    end_dt=datetime.combine(curr_day, time(13, 0)),
                    description="정치학원론 본수업 수강 및 핵심 필기",
                    location="대학교 강의실"
                ))
            elif weekday in [1, 3]: # 화, 목
                # GIS 이동
                college_events.append(make_event(
                    uid=f"college-mov-gis-{curr_day.strftime('%Y%m%d')}",
                    summary="[대학] 수업 이동 및 준비 (30분)",
                    start_dt=datetime.combine(curr_day, time(10, 0)),
                    end_dt=datetime.combine(curr_day, time(10, 30)),
                    description="강의실 이동 및 GIS행정자료분석 수업 준비"
                ))
                # GIS행정자료분석
                college_events.append(make_event(
                    uid=f"college-class-gis-{curr_day.strftime('%Y%m%d')}",
                    summary="[수업] GIS행정자료분석 (화/목)",
                    start_dt=datetime.combine(curr_day, time(10, 30)),
                    end_dt=datetime.combine(curr_day, time(12, 0)),
                    description="GIS행정자료분석 이론 및 실습 수강",
                    location="대학교 컴퓨터 실습실/강의실"
                ))
                # 정치경제학 이동
                college_events.append(make_event(
                    uid=f"college-mov-polecon-{curr_day.strftime('%Y%m%d')}",
                    summary="[대학] 수업 이동 및 준비 (30분)",
                    start_dt=datetime.combine(curr_day, time(14, 30)),
                    end_dt=datetime.combine(curr_day, time(15, 0)),
                    description="강의실 이동 및 정치경제학 수업 준비"
                ))
                # 정치경제학
                college_events.append(make_event(
                    uid=f"college-class-polecon-{curr_day.strftime('%Y%m%d')}",
                    summary="[수업] 정치경제학 (화/목)",
                    start_dt=datetime.combine(curr_day, time(15, 0)),
                    end_dt=datetime.combine(curr_day, time(16, 0)),
                    description="정치경제학 본수업 수강",
                    location="대학교 강의실"
                ))

            # 중간고사 집중 기간 (10/05 ~ 10/23, 시험: 10/19~23)
            if date(2026, 10, 5) <= curr_day <= date(2026, 10, 23) and weekday != 6:
                is_actual_exam_week = (curr_day >= date(2026, 10, 19))
                prefix = "[중간고사 주간]" if is_actual_exam_week else "[중간고사 대비집중]"
                if weekday != 3: # 목요일은 16:00~18:30 본가 이동
                    college_events.append(make_event(
                        uid=f"college-midterm-pm-{curr_day.strftime('%Y%m%d')}",
                        summary=f"{prefix} 전공 중간고사 집중 공부 (오후)",
                        start_dt=datetime.combine(curr_day, time(16, 0)),
                        end_dt=datetime.combine(curr_day, time(17, 0)),
                        description="GIS행정자료분석 과제/실습 복습, 정치학원론 및 정치경제학 전공 서적 및 강의자료 집중 회독"
                    ))
                if weekday == 3: # 목요일 야간은 20:00~23:00 (3시간)
                    night_end = time(23, 0)
                elif weekday == 5: # 토요일
                    night_end = time(22, 0)
                else:
                    night_end = time(23, 30)

                college_events.append(make_event(
                    uid=f"college-midterm-night-{curr_day.strftime('%Y%m%d')}",
                    summary=f"{prefix} 전공 중간고사 집중 공부 (야간)",
                    start_dt=datetime.combine(curr_day, time(20, 0)),
                    end_dt=datetime.combine(curr_day, night_end),
                    description="중간고사 기출문제 분석, 서술형/시험 대비 요약노트 암기 및 정리"
                ))

            # 기말고사 집중 기간 (12/01 ~ 12/18, 시험: 12/15~18)
            if date(2026, 12, 1) <= curr_day <= date(2026, 12, 18) and weekday != 6:
                is_actual_final_week = (curr_day >= date(2026, 12, 15))
                prefix = "[기말고사 주간]" if is_actual_final_week else "[기말고사 대비집중]"
                if weekday != 3: # 목요일은 16:00~18:30 본가 이동
                    college_events.append(make_event(
                        uid=f"college-final-pm-{curr_day.strftime('%Y%m%d')}",
                        summary=f"{prefix} 전공 기말고사 및 기말 과제 올인 (오후)",
                        start_dt=datetime.combine(curr_day, time(16, 0)),
                        end_dt=datetime.combine(curr_day, time(17, 0)),
                        description="기말 텀프로젝트/보고서 마무리 및 기말고사 시험범위 요약 정리"
                    ))
                if weekday == 3: # 목요일 야간은 20:00~23:00 (3시간)
                    night_end = time(23, 0)
                elif weekday == 5: # 토요일
                    night_end = time(22, 0)
                else:
                    night_end = time(23, 30)

                college_events.append(make_event(
                    uid=f"college-final-night-{curr_day.strftime('%Y%m%d')}",
                    summary=f"{prefix} 전공 기말고사 집중 공부 (야간)",
                    start_dt=datetime.combine(curr_day, time(20, 0)),
                    end_dt=datetime.combine(curr_day, night_end),
                    description="기말고사 A+ 대비 총정리 회독, 예상 문제 작성 및 최종 암기"
                ))

        # =========================================================
        # 3. PSAT STUDY (PSAT 학습 캘린더)
        # =========================================================
        if weekday == 6:
            # 일요일은 PSAT도 휴식
            continue

        # ---------------------------------------------------------
        # Case A: Phase 6 - 겨울방학 실전 스프린트 (2026.12.19 ~ 2027.02.15)
        # 5급 공채 실전 시험 시간표 체제
        # ---------------------------------------------------------
        if curr_day >= date(2026, 12, 19):
            # 워밍업 (09:00 ~ 10:00)
            psat_events.append(make_event(
                uid=f"psat-p6-warmup-{curr_day.strftime('%Y%m%d')}",
                summary="[실전 워밍업] 마인드셋 & 연산/조문 뇌풀기",
                start_dt=datetime.combine(curr_day, time(9, 0)),
                end_dt=datetime.combine(curr_day, time(9, 50)),
                description="시험장 도착 시간 시뮬레이션: 비타민 5세트, 헌법 핵심 조문 가볍게 눈으로 스캔하며 두뇌 예열"
            ))

            # 1교시: 헌법 (10:00 ~ 10:25)
            psat_events.append(make_event(
                uid=f"psat-p6-const-{curr_day.strftime('%Y%m%d')}",
                summary="[실전 1교시①] 5급 헌법 실전 모의고사 (25분/25문항)",
                start_dt=datetime.combine(curr_day, time(10, 0)),
                end_dt=datetime.combine(curr_day, time(10, 25)),
                description="실제 시험과 동일하게 마킹 포함 25분 엄수. 60점 패스 이상 안정권(75~80점) 목표"
            ))

            # 1교시: 언어논리 (10:45 ~ 12:15)
            psat_events.append(make_event(
                uid=f"psat-p6-verbal-{curr_day.strftime('%Y%m%d')}",
                summary="[실전 1교시②] 5급 언어논리 실전 모의고사 (90분/40문항)",
                start_dt=datetime.combine(curr_day, time(10, 45)),
                end_dt=datetime.combine(curr_day, time(12, 15)),
                description="실전 OMR 마킹 포함 90분 엄수. 독해 시간 관리, 논리퀴즈 선구안(버릴 문제 즉각 선별) 실전 적용"
            ))

            # 2교시: 자료해석 (14:00 ~ 15:30)
            psat_events.append(make_event(
                uid=f"psat-p6-data-{curr_day.strftime('%Y%m%d')}",
                summary="[실전 2교시] 5급 자료해석 실전 모의고사 (90분/40문항)",
                start_dt=datetime.combine(curr_day, time(14, 0)),
                end_dt=datetime.combine(curr_day, time(15, 30)),
                description="점심 식사 후 나른함 극복 훈련. 조훈 기본강의 실전 스킬(분율비교, 자릿수 감각) 총동원하여 40문항 풀이"
            ))

            # 3교시: 상황판단 (15:30 ~ 17:00)
            psat_events.append(make_event(
                uid=f"psat-p6-sit-{curr_day.strftime('%Y%m%d')}",
                summary="[실전 3교시] 5급 상황판단 실전 모의고사 (90분/40문항)",
                start_dt=datetime.combine(curr_day, time(15, 30)),
                end_dt=datetime.combine(curr_day, time(17, 0)),
                description="피로도가 극에 달하는 시간대 집중력 유지 훈련. 법조문/일치부합 정확도 100% 확보, 퀴즈는 밤도리 접근법으로 선별 공략"
            ))

            # 저녁 오답 분석 & 밤도리 프리미엄 체화 (20:00 ~ 21:30)
            psat_events.append(make_event(
                uid=f"psat-p6-feedback-{curr_day.strftime('%Y%m%d')}",
                summary="[실전 피드백] 당일 모의고사 심층 오답 & 밤도리 해설 체화",
                start_dt=datetime.combine(curr_day, time(20, 0)),
                end_dt=datetime.combine(curr_day, time(21, 30)),
                description="틀린 문항 원인 정밀 분석(단순 계산실수 vs 선지 함정 vs 발문 독해 오류). 밤도리 네이버 프리미엄 콘텐츠 해설을 참조하여 가장 효율적인 숏컷 풀이법 체화"
            ))

            # 야간 헌법 & 오답노트 (21:30 ~ 23:00)
            psat_events.append(make_event(
                uid=f"psat-p6-night-{curr_day.strftime('%Y%m%d')}",
                summary="[헌법 & 취약점] 최신 판례/조문 회독 및 오답노트 점검",
                start_dt=datetime.combine(curr_day, time(21, 30)),
                end_dt=datetime.combine(curr_day, time(23, 0)),
                description="당일 오답노트 단권화 체크 및 헌법 3개년 최신 판례 / 헌정사 빈출 지문 회독"
            ))
            continue

        # ---------------------------------------------------------
        # Case B: Phase 3 & 5 - 중간/기말고사 대비 기간 (시험 2주전~시험주간)
        # PSAT은 아침 감 유지 (1~1.5h) 모드로 축소하고 전공 집중
        # ---------------------------------------------------------
        is_midterm_period = (date(2026, 10, 5) <= curr_day <= date(2026, 10, 23))
        is_final_period = (date(2026, 12, 1) <= curr_day <= date(2026, 12, 18))

        if is_midterm_period or is_final_period:
            # 아침 감 유지 세션 (주중 09:00 ~ 10:00 / 토 09:30 ~ 10:30)
            exam_name = "중간고사" if is_midterm_period else "기말고사"
            maint_start = time(9, 30) if weekday == 5 else time(9, 0)
            maint_end = time(10, 30) if weekday == 5 else time(10, 0)
            psat_events.append(make_event(
                uid=f"psat-exam-maint-{curr_day.strftime('%Y%m%d')}",
                summary=f"[PSAT 감유지] 아침 비타민 연산 + 밤도리 데일리 풀이 ({exam_name} 대비 모드)",
                start_dt=datetime.combine(curr_day, maint_start),
                end_dt=datetime.combine(curr_day, maint_end),
                description=f"{exam_name} 기간 전공 몰입을 위해 PSAT은 감 유지에 집중합니다. 비타민 연산 3세트 + 밤도리 프리미엄 콘텐츠 숏컷/데일리 퀴즈 2~3문항 풀이로 실전 감각 유지"
            ))
            # 토요일 밤 가벼운 헌법 조문 복습만 유지 (21:30~22:30)
            if weekday == 5:
                psat_events.append(make_event(
                    uid=f"psat-exam-sat-const-{curr_day.strftime('%Y%m%d')}",
                    summary="[헌법 복습] 헌법 조문 가벼운 회독",
                    start_dt=datetime.combine(curr_day, time(21, 30)),
                    end_dt=datetime.combine(curr_day, time(22, 30)),
                    description="조문 잊어버리지 않도록 헌법 핵심 조문만 가볍게 리마인드"
                ))
            continue

        # ---------------------------------------------------------
        # Case C: 학기 중 일반 주간 (Phase 1, 2, 4)
        # 금요일은 실전 모의고사 DAY 고정
        # ---------------------------------------------------------
        if weekday == 4: # 금요일 고정 모의고사
            psat_events.append(make_event(
                uid=f"psat-fri-const-{curr_day.strftime('%Y%m%d')}",
                summary="[모의고사] 헌법 실전 모의고사 (09:00~10:00)",
                start_dt=datetime.combine(curr_day, time(9, 0)),
                end_dt=datetime.combine(curr_day, time(10, 0)),
                description="헌법 25문항 실전 시험 및 즉시 채점"
            ))
            psat_events.append(make_event(
                uid=f"psat-fri-verbal-{curr_day.strftime('%Y%m%d')}",
                summary="[모의고사] 언어논리 실전 모의고사 (10:30~12:00)",
                start_dt=datetime.combine(curr_day, time(10, 30)),
                end_dt=datetime.combine(curr_day, time(12, 0)),
                description="언어논리 40문항 90분 실전 풀이 (밤도리 프리미엄 콘텐츠에서 다룬 독해/논리 원칙 적용)"
            ))
            psat_events.append(make_event(
                uid=f"psat-fri-data-{curr_day.strftime('%Y%m%d')}",
                summary="[모의고사] 자료해석 실전 모의고사 (14:00~15:30)",
                start_dt=datetime.combine(curr_day, time(14, 0)),
                end_dt=datetime.combine(curr_day, time(15, 30)),
                description="자료해석 40문항 90분 실전 풀이 (조훈 계산 스킬 및 운영 선구안 점검)"
            ))
            psat_events.append(make_event(
                uid=f"psat-fri-sit-{curr_day.strftime('%Y%m%d')}",
                summary="[모의고사] 상황판단 실전 모의고사 (15:30~17:00)",
                start_dt=datetime.combine(curr_day, time(15, 30)),
                end_dt=datetime.combine(curr_day, time(17, 0)),
                description="상황판단 40문항 90분 실전 풀이 (17:00 저녁 식사 전 90분 집중 풀이)"
            ))
            psat_events.append(make_event(
                uid=f"psat-fri-rev1-{curr_day.strftime('%Y%m%d')}",
                summary="[모의고사] 심층 오답 분석 ① (언어논리/헌법)",
                start_dt=datetime.combine(curr_day, time(20, 0)),
                end_dt=datetime.combine(curr_day, time(21, 30)),
                description="당일 치른 언어논리와 헌법의 오답 지문 및 선지 구조 철저 분석. 밤도리 해설 참고"
            ))
            psat_events.append(make_event(
                uid=f"psat-fri-rev2-{curr_day.strftime('%Y%m%d')}",
                summary="[모의고사] 심층 오답 분석 ② (자료해석/상황판단)",
                start_dt=datetime.combine(curr_day, time(21, 30)),
                end_dt=datetime.combine(curr_day, time(23, 0)),
                description="자료해석 선지 판단 미스 분석 및 상황판단 퀴즈 문항 밤도리 프리미엄 콘텐츠 해설과 1:1 비교 분석"
            ))
            continue

        # ---------------------------------------------------------
        # Case D: 월/화/수/목/토 평상시 PSAT 스케줄 (Phase 1, 2, 4)
        # ---------------------------------------------------------
        is_week1 = (curr_day <= date(2026, 9, 6)) # 1주차
        is_week2 = (date(2026, 9, 7) <= curr_day <= date(2026, 9, 13)) # 2주차
        is_chohoon_period = (date(2026, 9, 7) <= curr_day <= date(2026, 9, 27)) # 2~4주차 (3주간 조훈 인강)

        # 1) 오전 세션
        if weekday in [0, 2]: # 월, 수 09:00~10:30 (1.5h)
            if is_week1 or is_week2:
                summary = "[초반집중] 자료해석 계산 연습① (1.5h)"
                desc = "비타민 스피드 연산(덧셈/뺄셈/곱셈/나눗셈), 분율-소수 변환표 암기 및 수치비교 맹훈련 (연속 1.5시간)"
            else:
                summary = "[PSAT 심화] 자료해석 기출 계산/유형 집중 훈련 (1.5h)"
                desc = "최근 5개년 5급 공채 자료해석 기출문제 표/차트 분석 및 빠른 수치 판단 훈련"

            psat_events.append(make_event(
                uid=f"psat-mw-calc1-{curr_day.strftime('%Y%m%d')}",
                summary=summary,
                start_dt=datetime.combine(curr_day, time(9, 0)),
                end_dt=datetime.combine(curr_day, time(10, 30)),
                description=desc
            ))

        elif weekday in [1, 3]: # 화, 목 09:00~10:00 (1.0h) - 10:00~10:30 GIS 이동준비와 분리
            if is_week1 or is_week2:
                summary = "[초반집중] 자료해석 계산 연습① (1.0h)"
                desc = "화/목 오전 계산 집중 1시간 (10:00~10:30 GIS 수업 이동 전 집중 연산)"
            else:
                summary = "[PSAT 심화] 자료해석 기출 계산/유형 집중 훈련 (1.0h)"
                desc = "화/목 오전 기출 계산 1시간 (10:00~10:30 GIS 수업 이동 전 빠른 기출 수치 판단)"

            psat_events.append(make_event(
                uid=f"psat-tt-calc1-{curr_day.strftime('%Y%m%d')}",
                summary=summary,
                start_dt=datetime.combine(curr_day, time(9, 0)),
                end_dt=datetime.combine(curr_day, time(10, 0)),
                description=desc
            ))

        elif weekday == 5: # 토요일 09:30~11:00 (1.5h)
            if is_week1 or is_week2:
                summary = "[초반집중] 자료해석 계산 연습① (1.5h)"
                desc = "비타민 연산 및 분수 비교 주간 누적 총정리 (연속 1.5시간)"
            else:
                summary = "[PSAT 심화] 자료해석 약점 보완 세션 (1.5h)"
                desc = "취약 표 유형(누적비율, 가중평균, 지수) 기출 심층 분석"

            psat_events.append(make_event(
                uid=f"psat-sat-calc1-{curr_day.strftime('%Y%m%d')}",
                summary=summary,
                start_dt=datetime.combine(curr_day, time(9, 30)),
                end_dt=datetime.combine(curr_day, time(11, 0)),
                description=desc
            ))

        # 2) 월/수 10:30~11:30 : 언어논리 심화 학습
        if weekday in [0, 2]:
            psat_events.append(make_event(
                uid=f"psat-mw-verbal-{curr_day.strftime('%Y%m%d')}",
                summary="[언어논리] 밤도리 프리미엄 콘텐츠 구조독해/심화 분석",
                start_dt=datetime.combine(curr_day, time(10, 30)),
                end_dt=datetime.combine(curr_day, time(11, 30)),
                description="밤도리 네이버 프리미엄 콘텐츠 언어논리 핵심 분석글 학습: 지문 문단 간 유기적 구조 파악, 평가원/5급 공채 매력적 오답 선지 함정 분석"
            ))

        # 3) 화/목 13:30~14:30 : 점심 식사(12:00~13:30) 후 언어/상황 숏컷 문제풀이 (14:30 정치경제학 이동 전)
        if weekday in [1, 3]:
            psat_events.append(make_event(
                uid=f"psat-tt-shortcut-{curr_day.strftime('%Y%m%d')}",
                summary="[숏컷훈련] 밤도리 언어/상황 숏컷 & 데일리 문제풀이",
                start_dt=datetime.combine(curr_day, time(13, 30)),
                end_dt=datetime.combine(curr_day, time(14, 30)),
                description="점심 후 1시간 집중: 밤도리 프리미엄 콘텐츠에 수록된 고난도 퀴즈 숏컷 풀이법 및 발문 스캔 테크닉 체화 (14:30 정치경제학 이동 전)"
            ))

        # 4) 토요일 11:00~13:00 : 헌법 집중 학습
        if weekday == 5:
            psat_events.append(make_event(
                uid=f"psat-sat-const-{curr_day.strftime('%Y%m%d')}",
                summary="[헌법] 헌법 집중학습 (기출 및 최신판례 회독 2시간)",
                start_dt=datetime.combine(curr_day, time(11, 0)),
                end_dt=datetime.combine(curr_day, time(13, 0)),
                description="5급 공채 헌법 빈출 쟁점 정리, 기본권/통치구조 핵심 판례 및 헌정사 암기"
            ))

        # 5) 오후 슬롯
        if weekday in [0, 2]: # 월, 수
            # 14:30 ~ 16:00 (1.5h)
            if is_week1:
                summary = "[자료해석] 기초 개념 정립 및 예습 세션"
                desc = "조훈 기본인강(2주차 시작) 전 교재 목차 확인, 자료해석 기본 유형 및 공식 체계화"
            elif is_chohoon_period:
                summary = "[인강] 조훈 자료해석 기본강의 (1강 + 복습)"
                desc = "조훈 기본강의 배속 수강(1.2~1.4배속) 후 남는 30~40분은 교재 예제 직접 풀이 및 선지 분석"
            else:
                summary = "[자료해석] 5급 기출 유형별 심층 분석 (1.5h)"
                desc = "완강한 조훈 기본강의 스킬을 기출에 직접 대입하여 선지 접근 순서 체화"

            psat_events.append(make_event(
                uid=f"psat-mw-pm1-{curr_day.strftime('%Y%m%d')}",
                summary=summary,
                start_dt=datetime.combine(curr_day, time(14, 30)),
                end_dt=datetime.combine(curr_day, time(16, 0)),
                description=desc
            ))

            # 16:00 ~ 17:00 (1.0h, 17:00 저녁 식사 전)
            if is_week1 or is_week2:
                summary = "[초반집중] 자료해석 계산 연습② (1.0h)"
                desc = "오후 세션 연속 계산 훈련: 비타민 곱셈/나눗셈 심화 및 분수 대소비교 테크닉 맹훈련"
            else:
                summary = "[상황판단] 밤도리 프리미엄 퀴즈/법조문 집중 훈련 (1.0h)"
                desc = "계산 세션 대체: 밤도리 프리미엄 콘텐츠 상황판단 퀴즈 해설 독해, 유형별 템플릿(경우의 수, 매칭, 계산형) 정립"

            psat_events.append(make_event(
                uid=f"psat-mw-pm2-{curr_day.strftime('%Y%m%d')}",
                summary=summary,
                start_dt=datetime.combine(curr_day, time(16, 0)),
                end_dt=datetime.combine(curr_day, time(17, 0)),
                description=desc
            ))

        elif weekday == 1: # 화요일 (16:00~17:00, 수업 끝난 후 / 목요일은 16:00~18:30 귀가 이동)
            if is_week1:
                summary = "[자료해석] 기본기 체계화 및 분율 환산표 훈련"
                desc = "조훈 인강 시작 전 분율 환산표 완벽 암기 및 기출 기본 표 해석"
            elif is_chohoon_period:
                summary = "[인강] 조훈 자료해석 기본강의 ② (1강 + 복습)"
                desc = "조훈 기본강의 배속 수강 및 교재 문제 실전 적용 복습"
            else:
                summary = "[자료해석] 5급 기출 유형별 심층 분석 (1.0h)"
                desc = "자료해석 고난도 표/차트 변환형 기출 집중 분석"

            psat_events.append(make_event(
                uid=f"psat-tue-pm2-{curr_day.strftime('%Y%m%d')}",
                summary=summary,
                start_dt=datetime.combine(curr_day, time(16, 0)),
                end_dt=datetime.combine(curr_day, time(17, 0)),
                description=desc
            ))

        elif weekday == 5: # 토요일
            # 14:30 ~ 16:00 (1.5h)
            if is_week1 or is_week2:
                summary = "[초반집중] 자료해석 계산 연습② (1.5h)"
                desc = "주간 계산 훈련 총정리 및 취약 연산(큰 수 나눗셈, 여사건) 집중 반복"
            else:
                summary = "[자료해석] 기출 실전 스피드 세션 (1.5h)"
                desc = "기출 20문항 하프 모의고사 시간 재고 풀기"

            psat_events.append(make_event(
                uid=f"psat-sat-pm1-{curr_day.strftime('%Y%m%d')}",
                summary=summary,
                start_dt=datetime.combine(curr_day, time(14, 30)),
                end_dt=datetime.combine(curr_day, time(16, 0)),
                description=desc
            ))

            # 16:00 ~ 17:00 (1.0h, 17:00 저녁 식사 전)
            psat_events.append(make_event(
                uid=f"psat-sat-pm2-{curr_day.strftime('%Y%m%d')}",
                summary="[상황판단] 밤도리 퀴즈/법조문 실전 연습 (1.0h)",
                start_dt=datetime.combine(curr_day, time(16, 0)),
                end_dt=datetime.combine(curr_day, time(17, 0)),
                description="밤도리 네이버 프리미엄 콘텐츠 엄선 고난도 퀴즈 풀이 및 법조문 단서 조항 스캔 훈련"
            ))

        # 6) 야간 20:00 ~ 21:30 (1.5h, 20시 정각 시작)
        if weekday == 0: # 월요일
            psat_events.append(make_event(
                uid=f"psat-mon-night1-{curr_day.strftime('%Y%m%d')}",
                summary="[상황판단] 밤도리 상황판단 퀴즈/법조문 심화",
                start_dt=datetime.combine(curr_day, time(20, 0)),
                end_dt=datetime.combine(curr_day, time(21, 30)),
                description="밤도리 프리미엄 콘텐츠 상황판단 해설 분석: 퀴즈 접근 메커니즘, 표 작성 요령 체화"
            ))
        elif weekday == 1: # 화요일
            if is_week1 or is_week2:
                summary = "[초반집중] 자료해석 계산 연습② (야간 1.5h)"
                desc = "화요일 저녁 계산 세션: 피로도가 있는 상태에서도 정확한 연산을 유지하는 집중력 훈련"
            else:
                summary = "[언어/상황] 취약 영역 기출 심화 (1.5h)"
                desc = "언어논리 강화/약화 또는 상황판단 고난도 연산형 문제 밤도리 해설과 함께 집중 공략"

            psat_events.append(make_event(
                uid=f"psat-tue-night1-{curr_day.strftime('%Y%m%d')}",
                summary=summary,
                start_dt=datetime.combine(curr_day, time(20, 0)),
                end_dt=datetime.combine(curr_day, time(21, 30)),
                description=desc
            ))
        elif weekday == 3: # 목요일 (귀가 후 20:00~21:30 야간 집중 공부)
            if is_week1 or is_week2:
                summary = "[초반집중] 자료해석 계산 연습② (야간 1.5h)"
                desc = "귀가 후 야간 계산 세션: 비타민 연산 및 곱셈/분수 대소비교 집중 훈련"
            elif is_chohoon_period:
                summary = "[인강] 조훈 자료해석 기본강의 ④ (1강 + 복습)"
                desc = "귀가 후 20:00부터 조훈 기본강의 집중 수강 및 교재 문제 복습 (주간 4번째 인강)"
            else:
                summary = "[자료해석] 5급 기출 유형별 심층 분석 (1.5h)"
                desc = "귀가 후 차분한 환경에서 자료해석 고난도 기출 심층 분석"

            psat_events.append(make_event(
                uid=f"psat-thu-night1-{curr_day.strftime('%Y%m%d')}",
                summary=summary,
                start_dt=datetime.combine(curr_day, time(20, 0)),
                end_dt=datetime.combine(curr_day, time(21, 30)),
                description=desc
            ))
        elif weekday == 2: # 수요일
            psat_events.append(make_event(
                uid=f"psat-wed-night1-{curr_day.strftime('%Y%m%d')}",
                summary="[언어논리] 밤도리 논리퀴즈/강화약화 심화",
                start_dt=datetime.combine(curr_day, time(20, 0)),
                end_dt=datetime.combine(curr_day, time(21, 30)),
                description="밤도리 프리미엄 콘텐츠 논리퀴즈 기호화 규칙 및 형식논리학 규칙 적용 연습"
            ))
        elif weekday == 5: # 토요일
            if is_week1:
                summary = "[PSAT 총정리] 주간 누적 복습 및 취약점 정리"
                desc = "1주차 연산 및 밤도리 분석 지문 총복습"
            elif is_chohoon_period:
                summary = "[인강] 조훈 기본강의 ⑤ / 주간 누적 복습"
                desc = "주당 10강 진도 완성(주 5개 슬롯 완수) 및 이번 주 수강 개념 총정리"
            else:
                summary = "[PSAT 총정리] 금요 모의고사 누적 오답 & 약점 보완"
                desc = "금요일 모의고사에서 드러난 취약 유형 밤도리 콘텐츠로 보충"

            psat_events.append(make_event(
                uid=f"psat-sat-night1-{curr_day.strftime('%Y%m%d')}",
                summary=summary if isinstance(summary, str) else summary[0],
                start_dt=datetime.combine(curr_day, time(20, 0)),
                end_dt=datetime.combine(curr_day, time(21, 30)),
                description=desc
            ))

        # 7) 심야 21:30 ~ 23:00 (1.5h)
        if weekday in [0, 1, 2, 3]: # 월~목
            psat_events.append(make_event(
                uid=f"psat-const-night2-{curr_day.strftime('%Y%m%d')}",
                summary="[헌법] 헌법 조문 및 기출 회독 (매일 1.5h)",
                start_dt=datetime.combine(curr_day, time(21, 30)),
                end_dt=datetime.combine(curr_day, time(23, 0)),
                description="헌법 조문 낭독, 조문별 빈출 기출 지문 O/X 풀이 및 암기 점검"
            ))
        elif weekday == 5: # 토요일
            college_events.append(make_event(
                uid=f"college-sat-assign-{curr_day.strftime('%Y%m%d')}",
                summary="[대학과제/자유] 대학 과제 정리 및 자유 휴식",
                start_dt=datetime.combine(curr_day, time(21, 30)),
                end_dt=datetime.combine(curr_day, time(23, 0)),
                description="한 주간 미뤄둔 대학 전공 과제 처리 또는 편안한 자유 시간"
            ))

    # =========================================================
    # ICS 파일 저장 (plan/ 디렉토리 내에 저장)
    # =========================================================
    import os
    plan_dir = os.path.dirname(os.path.abspath(__file__))

    def save_ics(filename: str, cal_name: str, events: list):
        header = f"""BEGIN:VCALENDAR
PRODID:-//PSAT Master Timetable//KR
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:{cal_name}
X-WR-TIMEZONE:Asia/Seoul
{VTIMEZONE_KST}
"""
        footer = "END:VCALENDAR\n"
        with open(filename, "w", encoding="utf-8") as f:
            f.write(header)
            f.write("".join(events))
            f.write(footer)
        print(f"Saved {filename} with {len(events)} events.")

    save_ics(os.path.join(plan_dir, "psat_study.ics"), "PSAT 학습 스케줄", psat_events)
    save_ics(os.path.join(plan_dir, "college_classes.ics"), "대학 수업 & 시험", college_events)
    save_ics(os.path.join(plan_dir, "daily_routine.ics"), "생활 루틴 (운동/식사/휴식)", routine_events)

if __name__ == "__main__":
    main()
