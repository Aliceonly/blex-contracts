#!/bin/bash

for dire in `ls contracts`; do
	if [ -f contracts/$dire ]; then
		continue;
	fi

	for file in `ls contracts/$dire/*.sol`
	do
		echo "build $file"
		solc --overwrite --optimize --optimize-runs 200 --include-path node_modules/ --base-path . --abi $file -o ./abi/
		solc --overwrite --optimize --optimize-runs 200 --include-path node_modules/ --base-path . --bin $file -o ./abi/
	done
done

nowDir=`pwd`
cd ./abi

for name in `ls *.bin`; do
	if [ $name != ${name##*_} ];then
		mv $name ${name##*_}
	fi
done

for name in `ls *.abi`; do
	if [ $name != ${name##*_} ];then
		mv $name ${name##*_}
	fi
done

cd $nowDir
