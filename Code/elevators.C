
//
//    elevators.C Ben Beshel
//
//    An elevator that takes people to their destination
//	  The building has 10 floors. People and number of elevators
//	  are generated via user parameters. 
//    People waiting are on the waiters array
//    People currently on an elevator are on riders array
//    People that have chosen an elevator and are waiting are on processed
//
#include <iostream>
#include <pthread.h>
#include <stdlib.h>
#include "building.h"
#include "elevators.h"
#include <pthread.h>
#include <semaphore.h>
#include <cstdlib>


std::vector<Elevator*> elevs;

//
// Elevator constructor
//   Called once for each elevator before the thread is created.
//
Elevator::Elevator()
{ 

	elevs.push_back(this);
	my_rider = NULL;
	dir = 0;
	dest = -1;
	st = -1;
	is_running = 0;
	pthread_mutex_init(&mut, NULL);
	pthread_cond_init(&todo, NULL);
  
}

//
// Elevator::display_passengers()
//
//  Call display() for each Person on the elevator.
//  Return the number of riders.
//
//  Beware: calling message() from this function will hang the simulation.
//
int Elevator::display_passengers()
{
  if (!riders.empty()) {
	  for (int i = 0; i < riders.size(); i++) {
		riders[i]->p->display();
	  }
	  return 1;
  } else {
	  return 0;
  }
}

//Checks what the elevator needs to do at this tick if we have a pending waiter
void Elevator::check_processed() {
	rider* iter;
	int door = 0;
	int size = processed.size();
	pthread_mutex_unlock(&mut);
	for (int i = size - 1; i > -1; i--) {
		iter = processed.at(i);
		if (iter->st == onfloor()) {
			if (door == 0) { 
				door = 1;
				open_door();
			}
			riders.push_back(iter);
			processed.erase(processed.begin() + i);
		}
	}
	if (door == 1) {
		close_door();
	}
	pthread_mutex_lock(&mut);
}

//finds the next furthest destination in our direction based on waiters/riders
void Elevator::find_dest() {
	int size = processed.size();
	rider* iter;
	if (!processed.empty() || !riders.empty()) {
		if (dir == 1) {
			dest = -1;
		} else {
			dest = 11;
		}
	}
	for (int i = size - 1; i > -1; i--) {
		iter = processed.at(i);
		if (dir == 1) {
			if (iter->st > dest) {
				dest = iter->st;
			} 
		} else {
			if (iter->st < dest) {
				dest = iter->st;
			}
		}
	}
	
	size = riders.size();
	for (int i = size - 1; i > -1; i--) {
		iter = riders.at(i);
		if (dir == 1) {
			if (iter->dest > dest) {
				dest = iter->dest;
			} 
		} else {
			if (iter->dest < dest) {
				dest = iter->dest;
			}
		}
	}
}

//Moves once in the current direction
void Elevator::move_in_dir() {
	
	pthread_mutex_unlock(&mut);
	find_dest();
	if (dir == 1) {
		if (onfloor() == 10 || dest < onfloor()) {
			dir = -dir;
			move_down();
		} else {
			move_up();
		}
	} else if (dir == -1) {
		if (onfloor() == 0 || dest > onfloor()) {
			dir = -dir;
			move_up();
		} else {
			move_down();
		}
	}
}

void Elevator::check_riders() {
	rider* iter;
	int door = 0;
	int size = riders.size();
	pthread_mutex_unlock(&mut);
	for (int i = size - 1; i > -1; i--) {
		iter = riders.at(i);
		if (iter->dest == onfloor()) {
			if (door == 0) {
				door = 1;
				open_door();
			}
			riders.erase(riders.begin() + i);
			sem_post(&iter->sem);
		} 
	}
	if (door == 1) {
		close_door();
	}
	pthread_mutex_lock(&mut);
}

void Elevator::push_to_waiters(rider* r) {
	pthread_mutex_lock(&mut);
	waiters.push_back(r);
	pthread_cond_signal(&todo);
	pthread_mutex_unlock(&mut);
}

//Calculates badness index based on:
//	current direction, current floor vs rider start,
//	current floor vs rider dest, and 
//  if other riders dest/start are before rider dest/start
int Elevator::calc_badness_index(rider* r) {
	//index for how bad we are
	int bad = 0;
	//current floor
	int fl = onfloor();
	//size of the vector in question
	int size;
	//do we change direction to pick me up?
	int stchdirbool = 0;
	//do we change direction to drop me off?
	int destchdirbool = 0;
	rider* temp;
	
	pthread_mutex_lock(&mut);
	//if going up
	if (dir == 1) {
		//elev reaches destination, then changes dir, then picks up
		if (r->st <= fl) {
			stchdirbool = 1;
		}
		//elev reaches destination (after pickup), changes dir, then drops off
		if (r->dest <= fl) {
			destchdirbool = 1;
		}
		//the only issue is if the elevator is on my floor...
		//if chdir, add up and down trips to me
		//otherwise add difference from fl to rider st
		if (stchdirbool == 1) {
			bad += (dest - fl) + (dest - r->st);
		} else {
			bad += (r->st - fl);
		}
		
		//this will produce overlap, but it does not matter
		//because all elevators will receieve the same overlap.
		//same as stchdirbool, but for rider dest
		if (destchdirbool == 1) {
			bad += (dest - fl) + (dest - r->dest);
		} else {
			bad += (r->dest - fl);
		}
		
		//check list of riders WAITING to be picked up
		if (!processed.empty()) {
			size = processed.size();
			for (int i = 0; i < size; i++) {
				temp = processed.at(i);
				//if my start greater than their start
				//and their start is in this direction
				if (r->st > temp->st && fl < temp->st) {
					bad += 1;
				}
				//if my start less than their start,
				//and their start also changes direction
				if (stchdirbool == 1) {
					if (r->st < temp->st && fl > temp->st) {
						bad += 1;
					}
				}
				
				//same as above but for riders dest
				if (r->dest > temp->dest && fl < temp->dest) {
					bad += 1;
				} 
				if (destchdirbool == 1) {
					if (r->dest < temp->dest && fl > temp->dest) {
						bad += 1;
					}
				}
			}
		}
		
		//list of riders RIDING 
		//no need to check starts, only dests
		if (!riders.empty()) {
			size = riders.size();
			for (int i = 0; i < size; i++) {
				temp = riders.at(i);
				if (r->dest > temp->dest && fl < temp->dest) {
					bad += 1;
				}
				if (stchdirbool == 1) {
					if (r->dest < temp->dest && fl > temp->dest) {
						bad += 1;
					}
				}
			}
		}
	//same exact code as above, but condition checking is opposite.
	//if going down
	} else if (dir == -1) {
		if (r->st >= fl) {
			stchdirbool = 1;
		}
		if (r->dest >= fl) {
			destchdirbool = 1;
		}
		
		if (stchdirbool == 1) {
			bad += (r->st - dest) + (fl - dest);
		} else {
			bad += (fl - r->st);
		}
		
		if (destchdirbool) {
			bad += (r->dest - dest) + (fl - dest);
		} else {
			bad += (fl - r->dest);
		}
		
		if (!processed.empty()) {
			size = processed.size();
			for (int i = 0; i < size; i++) {
				temp = processed.at(i);
				if (r->st < temp->st && fl > temp->st) {
					bad += 1;
				}
				if (stchdirbool == 1) {
					if (r->st > temp->st && fl < temp->st) {
						bad += 1;
					}
				}
				
				if (r->dest < temp->dest && fl > temp->dest) {
					bad += 1;
				} 
				if (destchdirbool == 1) {
					if (r->dest > temp->dest && fl < temp->dest) {
						bad += 1;
					}
				}
			}
		}
		
		if (!riders.empty()) {
			size = riders.size();
			for (int i = 0; i < size; i++) {
				temp = riders.at(i);
				if (r->dest < temp->dest && fl > temp->dest) {
					bad += 1;
				}
				if (stchdirbool == 1) {
					if (r->dest > temp->dest && fl < temp->dest) {
						bad += 1;
					}
				}
			}
		}
	//else, elevator just started, we set its direction
	} else {
		bad += (fl - r->st);
		//quick abs val, which never fails here
		if (bad < 0) {
			bad = -bad;
		}
	}
	pthread_mutex_unlock(&mut);
	return bad;
	
}

//
// Elevator::run()
//
//   Main thread for an elevator.
//   Will be called at the beginning of the simulation, to put the
//   Elevator into operation.  run() should pick up and deliver Persons,
//   coordinating with other Elevators for efficient service.
//   run should never return.
//   
void Elevator::run()
{
	//check waiters, pick them up
	//check dest, move, check floor for waiters, update
	//once at current dest, check if has riders, set dest
	
	while (true) { 
		pthread_mutex_lock(&mut);
		//If we still have waiters, evaluate and put on processed list
		while(!waiters.empty()) {
			//get a new person from list of waiting people
			my_rider = waiters.back();
			int fl = onfloor();
			//change direction if not moving
			if (dir == 0) {
				if (fl < my_rider->st) {
					dir = 1;
				} else if (fl > my_rider->st) {
					dir = -1;
				} else {
					dir = 1;
				}
				dest = my_rider->st;
				
				processed.push_back(my_rider);
				waiters.pop_back();
			} else if (dir == 1) {
				processed.push_back(my_rider);
				waiters.pop_back();
			} else {
				processed.push_back(my_rider);
				waiters.pop_back();
			}
		}
			
		//If we have a pending rider, evaluate
		if (!processed.empty()) {
			message("Checking waiting");
			check_processed();
		}	

		//If we still have riders onboard, evaluate
		if (!riders.empty()) {
			message("Checking riders");
			check_riders();
		}		
		
		//Moves one floor
		move_in_dir();
		
		//Thread sleeps until a person notifies it needs an elevator
		while (waiters.empty() && riders.empty() && processed.empty()) {
			pthread_cond_wait(&todo, &mut);
		}
		pthread_mutex_unlock(&mut);
	}
}

//
//  take_elevator
//
//    A Person (who) calls this function to take an elevator from their
//    current floor (origin) to a different floor (destination).
//
void take_elevator(const Person *who, int origin, int destination)
{
	int pos;
	int el = 0;
	rider* temp = new rider;
	temp->p = who;
	temp->st = origin;
	temp->dest = destination;
	temp->taken = 0;
	sem_init(&temp->sem, 0, 0);
	
	//calculate best option for this rider 
	//loops through each elevator and chooses the best option
	int cur_bad = -1;
	int temp_bad;
	for (int i = 0; i < elevs.size(); i++) {
		temp_bad = (elevs.at(i))->calc_badness_index(temp);
		if (cur_bad == -1 || temp_bad < cur_bad) {
			cur_bad = temp_bad;
			el = i;
		}
	}
	
	//push our waiter to the correct elevator
	(elevs.at(el))->push_to_waiters(temp);

	//we wait until the elevator takes my trip
	sem_wait(&temp->sem);
	
	delete(temp);
	return;
}
